// Wall-jump chaining score system: every wall jump earns base points times
// an escalating multiplier that grows with each consecutive wall jump.
// Landing on top of anything (a platform or the ground) banks the pending
// chain into the run's total and resets the chain - so the risk/reward is
// "keep chaining wall jumps for a bigger multiplier" vs "land safely and
// lock in what you've got." The best total across runs is kept in
// localStorage so there's a high score to come back and beat.

const STORAGE_KEY = 'wallrunner.highScore';
export const BASE_WALL_JUMP_POINTS = 100;

export type FloatingPopup = { x: number; y: number; text: string; timer: number; life: number };

export type ScoreState = {
  totalScore: number;
  highScore: number;
  pendingScore: number;
  chainCount: number;
  bankFlashTimer: number;
  newHighScoreFlashTimer: number;
  comboPulseTimer: number;
  popups: FloatingPopup[];
};

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Private browsing / storage disabled - the score just won't persist.
  }
}

export function createScoreState(): ScoreState {
  return {
    totalScore: 0,
    highScore: loadHighScore(),
    pendingScore: 0,
    chainCount: 0,
    bankFlashTimer: 0,
    newHighScoreFlashTimer: 0,
    comboPulseTimer: 0,
    popups: [],
  };
}

// Called when looping back to the first level - a fresh attempt at beating
// the high score, distinct from just passing through to the next level.
export function resetRun(state: ScoreState) {
  state.totalScore = 0;
  state.pendingScore = 0;
  state.chainCount = 0;
  state.popups.length = 0;
}

export function registerWallJump(state: ScoreState, x: number, y: number) {
  state.chainCount += 1;
  const multiplier = state.chainCount;
  const earned = BASE_WALL_JUMP_POINTS * multiplier;
  state.pendingScore += earned;
  state.comboPulseTimer = 0.28;
  state.popups.push({ x, y, text: `+${earned}`, timer: 0, life: 0.7 });
  if (state.popups.length > 12) state.popups.shift();
}

// Landing on top of a platform (or the ground) locks in whatever chain was
// pending. Safe to call every frame the player happens to be grounded -
// it's a no-op once pendingScore is already 0.
export function bankPendingScore(state: ScoreState) {
  if (state.pendingScore <= 0) {
    state.chainCount = 0;
    return;
  }
  state.totalScore += state.pendingScore;
  state.bankFlashTimer = 0.5;
  if (state.totalScore > state.highScore) {
    state.highScore = state.totalScore;
    saveHighScore(state.highScore);
    state.newHighScoreFlashTimer = 1.4;
  }
  state.pendingScore = 0;
  state.chainCount = 0;
}

// Falling off the level (or any other non-landing reset) forfeits the
// pending chain instead of banking it.
export function discardPendingScore(state: ScoreState) {
  state.pendingScore = 0;
  state.chainCount = 0;
}

export function updateScoreFx(state: ScoreState, dt: number) {
  const dtSec = dt / 60;
  if (state.bankFlashTimer > 0) state.bankFlashTimer = Math.max(0, state.bankFlashTimer - dtSec);
  if (state.newHighScoreFlashTimer > 0) state.newHighScoreFlashTimer = Math.max(0, state.newHighScoreFlashTimer - dtSec);
  if (state.comboPulseTimer > 0) state.comboPulseTimer = Math.max(0, state.comboPulseTimer - dtSec);
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const popup = state.popups[i];
    popup.timer += dtSec;
    if (popup.timer >= popup.life) state.popups.splice(i, 1);
  }
}

// --- World-space combo feedback: floating "+N" popups at the wall-kick
// point, plus a multiplier badge that pulses above the player while a
// chain is active. Call from inside the camera-transformed draw block so
// it scrolls with the world instead of sticking to the screen.
export function drawComboFx(ctx: CanvasRenderingContext2D, state: ScoreState, playerX: number, playerY: number) {
  for (const popup of state.popups) {
    const t = popup.timer / popup.life;
    const alpha = 1 - t;
    const riseY = popup.y - t * 46;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(20,14,6,${alpha * 0.8})`;
    ctx.strokeText(popup.text, popup.x, riseY);
    ctx.fillStyle = `rgba(255,214,110,${alpha})`;
    ctx.fillText(popup.text, popup.x, riseY);
  }
  ctx.textAlign = 'left';

  if (state.chainCount > 0) {
    const pulse = 1 + (state.comboPulseTimer / 0.28) * 0.35;
    const cx = playerX;
    const cy = playerY - 44;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,14,6,0.85)';
    ctx.strokeText(`×${state.chainCount}`, 0, 0);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(`×${state.chainCount}`, 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
  }
}

// --- Screen-space persistent HUD: current run total + best. Call after
// the world transform has been restored (unscaled screen pixels).
export function drawScoreHud(ctx: CanvasRenderingContext2D, width: number, state: ScoreState) {
  const flash = state.bankFlashTimer > 0 ? state.bankFlashTimer / 0.5 : 0;
  const x = width - 18;

  ctx.textAlign = 'right';
  ctx.font = `bold ${28 + flash * 5}px sans-serif`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,8,6,0.8)';
  ctx.strokeText(state.totalScore.toLocaleString(), x, 40);
  ctx.fillStyle = `rgba(255,${225 - Math.floor(flash * 40)},${140 + Math.floor(flash * 60)},1)`;
  ctx.fillText(state.totalScore.toLocaleString(), x, 40);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('SCORE', x, 16);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`Best ${state.highScore.toLocaleString()}`, x, 58);

  if (state.newHighScoreFlashTimer > 0) {
    const t = state.newHighScoreFlashTimer / 1.4;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = `rgba(255,214,110,${Math.min(1, t * 2)})`;
    ctx.fillText('NEW BEST!', x, 74);
  }
  ctx.textAlign = 'left';
}
