// Calligraphy text banners ("Level N" intro, "Great" victory), the
// shuriken-throw transition that wipes to the next level, and the
// game-ending cinematic (final gate reached -> freeze -> shake -> white
// flash -> scrolling credits). All screen-space - callers draw these after
// the world transform has been restored.

function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = p - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export class CalligraphyBanner {
  private text = '';
  private t = 0;
  private active = false;
  private color = '#c0392b';
  private inDur = 0.35;
  private holdDur = 0.9;
  private outDur = 0.35;

  show(text: string, opts: { inDur?: number; holdDur?: number; outDur?: number; color?: string } = {}) {
    this.text = text;
    this.t = 0;
    this.active = true;
    this.inDur = opts.inDur ?? 0.35;
    this.holdDur = opts.holdDur ?? 0.9;
    this.outDur = opts.outDur ?? 0.35;
    this.color = opts.color ?? '#c0392b';
  }

  get isActive() {
    return this.active;
  }

  get totalDuration() {
    return this.inDur + this.holdDur + this.outDur;
  }

  update(dt: number) {
    if (!this.active) return;
    this.t += dt / 60;
    if (this.t >= this.totalDuration) this.active = false;
  }

  // Fits the text to fill most of the given box rather than drawing at a
  // fixed size, so a short word like "Great" gets to be huge while a
  // longer string like "Level 20" still fits without overflowing.
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxWidth: number, maxHeight: number) {
    if (!this.active) return;
    let alpha = 1;
    let scale = 1;
    if (this.t < this.inDur) {
      const p = this.t / this.inDur;
      alpha = p;
      scale = 0.6 + 0.4 * easeOutBack(p);
    } else if (this.t < this.inDur + this.holdDur) {
      alpha = 1;
      scale = 1;
    } else {
      const p = (this.t - this.inDur - this.holdDur) / this.outDur;
      alpha = 1 - p;
      scale = 1 + 0.12 * p;
    }

    const referenceSize = 200;
    ctx.font = `${referenceSize}px "MaShanZheng", serif`;
    const measuredWidth = ctx.measureText(this.text).width || referenceSize;
    let fontSize = (maxWidth / measuredWidth) * referenceSize;
    fontSize = Math.min(fontSize, maxHeight);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px "MaShanZheng", serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = fontSize * 0.1;
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

function drawShurikenShape(ctx: CanvasRenderingContext2D, radius: number) {
  const bladeAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  const innerR = radius * 0.22;
  const bladeHalfAngle = 0.34;

  ctx.beginPath();
  bladeAngles.forEach((a, i) => {
    const tipX = Math.cos(a) * radius, tipY = Math.sin(a) * radius;
    const leftA = a - bladeHalfAngle, rightA = a + bladeHalfAngle;
    const leftX = Math.cos(leftA) * innerR, leftY = Math.sin(leftA) * innerR;
    const rightX = Math.cos(rightA) * innerR, rightY = Math.sin(rightA) * innerR;
    if (i === 0) ctx.moveTo(leftX, leftY);
    else ctx.lineTo(leftX, leftY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(rightX, rightY);
  });
  ctx.closePath();

  const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  grad.addColorStop(0, '#9aa4b2');
  grad.addColorStop(0.5, '#3d434d');
  grad.addColorStop(1, '#17191c');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#0a0b0c';
  ctx.lineWidth = Math.max(1, radius * 0.04);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
}

export class ShurikenTransition {
  private t = 0;
  private active = false;
  private duration = 1.15;
  private startX = 0;
  private startY = 0;
  private onComplete: (() => void) | null = null;
  private fired = false;

  start(fromX: number, fromY: number, onComplete: () => void) {
    this.t = 0;
    this.active = true;
    this.fired = false;
    this.startX = fromX;
    this.startY = fromY;
    this.onComplete = onComplete;
  }

  get isActive() {
    return this.active;
  }

  update(dt: number) {
    if (!this.active) return;
    this.t += dt / 60;
    if (this.t >= this.duration) {
      this.active = false;
      if (!this.fired) {
        this.fired = true;
        this.onComplete?.();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
    if (!this.active) return;
    const p = clamp01(this.t / this.duration);
    const cx = screenW / 2;
    const cy = screenH / 2;
    // Sweeping arc toward screen center: quadratic bezier with a control
    // point off to the side, so the star curves in rather than flying
    // straight at the viewer.
    const ctrlX = this.startX - screenW * 0.3;
    const ctrlY = this.startY - screenH * 0.3;
    const oneMinusP = 1 - p;
    const x = oneMinusP * oneMinusP * this.startX + 2 * oneMinusP * p * ctrlX + p * p * cx;
    const y = oneMinusP * oneMinusP * this.startY + 2 * oneMinusP * p * ctrlY + p * p * cy;
    const growth = Math.pow(p, 2.4);
    const radius = 16 + growth * screenW * 1.3;
    const rotation = p * 22;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    drawShurikenShape(ctx, radius);
    ctx.restore();

    // Once the star is large enough to be off-screen at its edges, fade a
    // solid wipe over everything else so the level swap underneath is
    // invisible to the player.
    const wipeAlpha = clamp01((radius - screenW * 0.35) / (screenW * 0.35));
    if (wipeAlpha > 0) {
      ctx.fillStyle = `rgba(12,11,14,${wipeAlpha})`;
      ctx.fillRect(0, 0, screenW, screenH);
    }
  }
}

// --- Game-ending cinematic ---------------------------------------------
//
// Four stages, driven by one running clock:
//   freeze  - nothing moves, a beat of stillness after the last gate lands
//   shake   - a decaying screen shake (caller applies the offset around its
//             own world draw; this class only reports it)
//   flash   - a white ring expands from the arch's screen position until it
//             covers everything
//   credits - solid white background, red calligraphy-font lines crawling
//             upward from the bottom, classic credits-roll style
//
// Scroll duration isn't fixed - it's derived from how much text there is
// and how tall the screen is, so adding more lines later doesn't require
// retuning a duration constant.
export type EndingStage = 'freeze' | 'shake' | 'flash' | 'credits' | 'done';

const FREEZE_DUR = 1.0;
const SHAKE_DUR = 3.5;
const FLASH_DUR = 0.7;
const SHAKE_AMPLITUDE = 12;
const CREDITS_LINE_HEIGHT = 44;
const CREDITS_SCROLL_SPEED = 34; // px/sec

export class EndingSequence {
  private t = 0;
  private active = false;
  private goalX = 0;
  private goalY = 0;
  private lines: string[] = [];
  private creditsDur = 6;
  private creditsStartY = 0;

  // `creditsStartY` is where the crawl's leading edge sits at the moment
  // the credits stage begins (typically just above a "Continue" button)
  // rather than off-screen - the player sees text immediately instead of
  // waiting for it to scroll up from below the bottom edge.
  start(goalScreenX: number, goalScreenY: number, lines: string[], creditsStartY: number) {
    this.t = 0;
    this.active = true;
    this.goalX = goalScreenX;
    this.goalY = goalScreenY;
    this.lines = lines;
    this.creditsStartY = creditsStartY;
    // Scroll continues until the last line has cleared the top edge.
    const totalTextHeight = lines.length * CREDITS_LINE_HEIGHT;
    this.creditsDur = (creditsStartY + totalTextHeight) / CREDITS_SCROLL_SPEED;
  }

  get isActive() {
    return this.active;
  }

  get stage(): EndingStage {
    if (!this.active) return 'done';
    if (this.t < FREEZE_DUR) return 'freeze';
    if (this.t < FREEZE_DUR + SHAKE_DUR) return 'shake';
    if (this.t < FREEZE_DUR + SHAKE_DUR + FLASH_DUR) return 'flash';
    if (this.t < FREEZE_DUR + SHAKE_DUR + FLASH_DUR + this.creditsDur) return 'credits';
    return 'done';
  }

  // A jitter to translate the world draw by during the 'shake' stage; zero
  // at every other stage. Stays close to full intensity for most of the
  // stage and only tapers sharply right at the end, so a longer shake
  // reads as sustained violence building to the flash rather than a slow
  // fade-out.
  get shakeOffset(): { x: number; y: number } {
    if (this.stage !== 'shake') return { x: 0, y: 0 };
    const localT = this.t - FREEZE_DUR;
    const amp = SHAKE_AMPLITUDE * Math.pow(1 - localT / SHAKE_DUR, 0.3);
    return { x: (Math.random() - 0.5) * 2 * amp, y: (Math.random() - 0.5) * 2 * amp };
  }

  update(dt: number) {
    if (!this.active) return;
    this.t += dt / 60;
    if (this.stage === 'done') {
      this.active = false;
    }
  }

  // Draws the flash/credits overlay. No-op during freeze/shake, since
  // those stages have nothing to layer on top of the (caller-drawn,
  // possibly shaken) frozen world.
  draw(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
    const stage = this.stage;
    if (stage === 'flash') {
      const localT = this.t - FREEZE_DUR - SHAKE_DUR;
      const p = clamp01(localT / FLASH_DUR);
      const maxR = Math.hypot(screenW, screenH) * 1.05;
      // Ease-in growth (slow start, accelerating) so the ring visibly
      // expands from the arch for most of the stage instead of flooding
      // the screen white almost immediately.
      const r = Math.max(1, maxR * Math.pow(p, 1.8));
      const grad = ctx.createRadialGradient(this.goalX, this.goalY, 0, this.goalX, this.goalY, r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.85, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, screenW, screenH);
      if (p > 0.85) {
        ctx.fillStyle = `rgba(255,255,255,${(p - 0.85) / 0.15})`;
        ctx.fillRect(0, 0, screenW, screenH);
      }
    } else if (stage === 'credits' || stage === 'done' || !this.active) {
      ctx.fillStyle = '#fdfaf3';
      ctx.fillRect(0, 0, screenW, screenH);
      if (this.lines.length === 0) return;
      const localT = stage === 'credits' ? this.t - FREEZE_DUR - SHAKE_DUR - FLASH_DUR : this.creditsDur;
      const startY = this.creditsStartY;
      const scrolled = localT * CREDITS_SCROLL_SPEED;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a8332b';
      this.lines.forEach((line, i) => {
        const y = startY - scrolled + i * CREDITS_LINE_HEIGHT;
        if (y < -CREDITS_LINE_HEIGHT || y > screenH + CREDITS_LINE_HEIGHT) return;
        if (line.length === 0) return;
        ctx.font = `24px "DelaGothicOne", sans-serif`;
        ctx.fillText(line, screenW / 2, y);
      });
      ctx.textAlign = 'left';
    }
  }
}
