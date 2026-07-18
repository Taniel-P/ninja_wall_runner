import idleUrl from './assets/ninja/idle.png';
import runUrl from './assets/ninja/run.png';
import jumpUrl from './assets/ninja/jump.png';
import slideUrl from './assets/ninja/slide.png';
import { AnimatedSprite, loadClip } from './sprites';

// Frame geometry baked in at atlas-build time (see assets/ninja/manifest.json).
const clips = {
  idle: loadClip(idleUrl, 10, 97, 184, 10),
  run: loadClip(runUrl, 10, 152, 192, 14),
  jump: loadClip(jumpUrl, 10, 152, 203, 12),
  // "slide" is a low forward lunge in the source art; repurposed here as the
  // wall-cling pose, rotated and pinned to whichever wall the player is on.
  wallcling: loadClip(slideUrl, 10, 157, 147, 8),
};

export const ninjaSprite = new AnimatedSprite(clips, 'idle');

// The tallest frame (jump, 203px) at render scale sets how far above the
// player's feet the sprite extends - used so the camera/ground alignment
// feels right regardless of which clip is currently playing.
export const NINJA_RENDER_SCALE = 0.42;

// Double-jump timing: the whole embellishment runs for DOUBLE_JUMP_FX_FRAMES
// ticks. The first REACH_HOLD_FRAMES of those pin the sprite on a held,
// stretched "reaching" pose (an exaggerated anticipation beat); the rest
// ease the stretch back to normal size while the jump clip resumes autoplay.
export const DOUBLE_JUMP_FX_FRAMES = 26;
const REACH_HOLD_FRAMES = 10;
const REACH_FRAME_INDEX = 7; // jump clip frame with the most forward/up reach

export type NinjaPose = {
  clip: keyof typeof clips;
  flipX: boolean;
  rotation: number;
  scaleX: number;
  scaleY: number;
  holding: boolean;
  reachStrength: number;
};

export function pickNinjaPose(state: {
  facing: -1 | 1;
  grounded: boolean;
  onWall: boolean;
  wallDirection: -1 | 1 | null;
  vx: number;
  vy: number;
  doubleJumpFxTimer: number;
}): NinjaPose {
  const faceLeft = state.facing < 0;
  const base = { clip: 'jump' as const, flipX: faceLeft, rotation: 0, scaleX: 1, scaleY: 1, holding: false, reachStrength: 0 };

  if (state.onWall && state.wallDirection) {
    // Pressed against the wall: face away from it, lean the sprite into it.
    const facingAwayFromWall = state.wallDirection < 0;
    return { ...base, clip: 'wallcling', flipX: !facingAwayFromWall, rotation: state.wallDirection * 0.35 };
  }

  if (!state.grounded) {
    if (state.doubleJumpFxTimer > 0) {
      const elapsed = DOUBLE_JUMP_FX_FRAMES - state.doubleJumpFxTimer;
      if (elapsed < REACH_HOLD_FRAMES) {
        // Anticipation: stretch up-and-out toward the peak reach, biggest
        // and most stretched right as the hold pose lands.
        const t = elapsed / REACH_HOLD_FRAMES;
        const stretch = 1 + 0.18 * Math.sin(t * Math.PI * 0.5);
        return {
          ...base,
          clip: 'jump',
          scaleX: 1 + 0.07 * t,
          scaleY: stretch,
          holding: true,
          reachStrength: t,
        };
      }
      // Release: ease the exaggerated stretch back down to normal while
      // the jump clip resumes its regular tumble cycle.
      const releaseT = (elapsed - REACH_HOLD_FRAMES) / (DOUBLE_JUMP_FX_FRAMES - REACH_HOLD_FRAMES);
      const ease = 1 - releaseT;
      return {
        ...base,
        clip: 'jump',
        scaleX: 1 + 0.07 * ease,
        scaleY: 1 + 0.18 * ease,
        holding: false,
        reachStrength: 0,
      };
    }
    return { ...base, clip: 'jump' };
  }

  if (Math.abs(state.vx) > 0.3) {
    return { ...base, clip: 'run' };
  }

  return { ...base, clip: 'idle' };
}

export function ninjaReachFrame() {
  return REACH_FRAME_INDEX;
}

// A small procedural flourish behind the reaching hand - flat, bold-outline
// streaks in the cel-shading style, since the source art has no dedicated
// "reach" frame to carry the exaggeration on its own.
export function drawReachBurst(ctx: CanvasRenderingContext2D, x: number, y: number, facing: -1 | 1, strength: number) {
  if (strength <= 0) return;
  const dir = facing;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = strength * 0.9;
  ctx.strokeStyle = '#fff2c2';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const spread = (i - 1.5) * 0.22;
    const len = 14 + i * 4;
    ctx.lineWidth = 3 - i * 0.4;
    ctx.beginPath();
    ctx.moveTo(dir * 6, -4);
    ctx.lineTo(dir * (6 + len * Math.cos(spread)), -4 - len * Math.sin(spread) - len * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}
