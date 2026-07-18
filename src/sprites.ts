// Minimal sprite-atlas animation engine. Each clip is a horizontal filmstrip
// PNG (one row of equal-width frames) drawn from a single Image, so playing
// an animation is just picking a source-rect column each tick.

export type Clip = {
  image: HTMLImageElement;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
};

export function loadClip(src: string, frameCount: number, frameWidth: number, frameHeight: number, fps: number, loop = true): Clip {
  const image = new Image();
  image.src = src;
  return { image, frameCount, frameWidth, frameHeight, fps, loop };
}

export class AnimatedSprite {
  private clips: Record<string, Clip>;
  private current: string;
  private frameTime = 0;
  private frame = 0;
  private holdFrames = 0;

  constructor(clips: Record<string, Clip>, initial: string) {
    this.clips = clips;
    this.current = initial;
  }

  play(name: string, restartIfSame = false) {
    this.holdFrames = 0;
    if (name === this.current && !restartIfSame) return;
    this.current = name;
    this.frame = 0;
    this.frameTime = 0;
  }

  // Pins playback to a specific frame of a clip for `holdFrames` ticks
  // (a frozen anticipation/emphasis pose), after which normal autoplay
  // resumes from that frame. Calling this again refreshes the hold.
  hold(name: string, frameIndex: number, holdFrames: number) {
    this.current = name;
    const clip = this.clips[name];
    this.frame = clip ? Math.min(frameIndex, clip.frameCount - 1) : frameIndex;
    this.frameTime = 0;
    this.holdFrames = holdFrames;
  }

  current_() {
    return this.current;
  }

  update(dt: number) {
    if (this.holdFrames > 0) {
      this.holdFrames -= dt;
      return;
    }
    const clip = this.clips[this.current];
    if (!clip) return;
    this.frameTime += dt / 60;
    const frameDuration = 1 / clip.fps;
    while (this.frameTime >= frameDuration) {
      this.frameTime -= frameDuration;
      this.frame += 1;
      if (this.frame >= clip.frameCount) {
        this.frame = clip.loop ? 0 : clip.frameCount - 1;
      }
    }
  }

  // Draws the current frame centered horizontally at (x, y) with its bottom
  // edge resting on y (i.e. y is the feet/ground contact point).
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, opts: { flipX?: boolean; rotation?: number; scaleX?: number; scaleY?: number; alpha?: number } = {}) {
    const clip = this.clips[this.current];
    if (!clip || !clip.image.complete || clip.image.naturalWidth === 0) return;
    const sx = opts.scaleX ?? 1;
    const sy = opts.scaleY ?? sx;
    const w = clip.frameWidth * sx;
    const h = clip.frameHeight * sy;

    ctx.save();
    ctx.translate(x, y);
    if (opts.flipX) ctx.scale(-1, 1);
    if (opts.rotation) ctx.rotate(opts.rotation);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.drawImage(
      clip.image,
      this.frame * clip.frameWidth, 0, clip.frameWidth, clip.frameHeight,
      -w / 2, -h, w, h,
    );
    ctx.restore();
  }
}
