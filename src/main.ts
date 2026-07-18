import './style.css';
import { ninjaSprite, pickNinjaPose, drawReachBurst, ninjaReachFrame, NINJA_RENDER_SCALE, DOUBLE_JUMP_FX_FRAMES } from './ninja';
import { drawSky as drawForestSky, drawMountains, drawMist, drawBambooGrove, drawPlatform as drawForestPlatform, drawToriiGate, drawLantern } from './forest';
import { drawSky as drawCitySky, drawSkyline, drawHaze, drawAlleyClutter, drawPlatform as drawCityPlatform, drawShrineGate, drawNeonSign } from './city';
import { drawSky as drawMountainSky, drawPeaks, drawStormClouds, drawCliffside, drawPlatform as drawMountainPlatform, drawStormGate, drawPrayerLantern } from './mountain';
import { drawSky as drawTempleSky, drawTempleSkyline, drawEmberHaze, drawRuinClutter, drawPlatform as drawTemplePlatform, drawFinalGate, drawSpiritFlame } from './temple';
import { LEVELS, type Level } from './levels';
import { CalligraphyBanner, ShurikenTransition, EndingSequence, type EndingStage } from './sequence';
import { createScoreState, registerWallJump, bankPendingScore, discardPendingScore, resetRun, updateScoreFx, drawComboFx, drawScoreHud } from './score';
import { isLeaderboardEnabled, getNickname, setNickname, ensureNickname, hasBeenPromptedForNickname, markPromptedForNickname, submitScore, fetchTopScores, getDeviceId } from './leaderboard';
import { playJump, playWallJump, playDoubleJump, playGoal, playFootstep, playExplosion, startRumble, stopRumble, playGong, playMusicTrack, stopMusic, unlockAudio, type MusicTrack } from './audio';

type Direction = -1 | 1;
type Phase = 'menu' | 'intro' | 'playing' | 'victory' | 'ending';

type PlayerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  facing: Direction;
  onWall: boolean;
  wallDirection: Direction | null;
  coyoteTime: number;
  wallJumpCooldown: number;
  doubleJumpAvailable: boolean;
  doubleJumpFxTimer: number;
  visitedCorners: Set<string>;
  victory: boolean;
};

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const menuScreenEl = document.getElementById('menuScreen') as HTMLDivElement;
const gameChromeEl = document.getElementById('gameChrome') as HTMLDivElement;
const endingContinueEl = document.getElementById('endingContinue') as HTMLButtonElement;

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const viewport = { width: 480, height: 720 };
let width = 0;
let height = 0;
let scale = 1;
let lastTime = 0;
let cameraY = 0;
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 13; // frames between footstep taps while running
const keyboard = { left: false, right: false, jump: false, jumpQueued: false };

let currentLevelIndex = 0;
let level: Level = LEVELS[currentLevelIndex];

let phase: Phase = 'menu';
let phaseTimer = 0;
let shurikenFired = false;

const introBanner = new CalligraphyBanner();
const victoryBanner = new CalligraphyBanner();
const menuBanner = new CalligraphyBanner();
const endingSequence = new EndingSequence();
// Tracks the previous frame's ending-sequence stage so the rumble/explosion
// sounds can be tied to the moment a stage *starts* rather than replaying
// every single frame that stage happens to be active.
let lastEndingStage: EndingStage | null = null;

// End-of-game credits crawl, all rendered in red. Five variations - one is
// picked at random each time the player finishes the last level, so
// beating the game more than once doesn't always show the same text.
const ENDING_CREDITS_VARIANTS: string[][] = [
  [
    'THE FINAL GATE',
    '',
    'You have reached the heart',
    'of the ancient temple.',
    '',
    'A path attempted by many...',
    '',
    '...and conquered by none.',
    '',
    'UNTIL NOW.',
    '',
    'The storm breaks.',
    'The flames fall silent.',
    '',
    'The guardian that watched',
    "from the mountain's shadow",
    'watches no longer.',
    '',
    'Where darkness once waited,',
    'only your legend remains.',
  ],
  [
    'THE LAST ASCENT',
    '',
    'Forest. City. Mountain. Temple.',
    '',
    'Four realms.',
    'One climb.',
    '',
    'Every wall you struck',
    'carried you higher',
    'than gravity ever allowed.',
    '',
    'THE CLIMB IS OVER.',
    '',
    'There is no higher floor',
    'in the ancient temple.',
    '',
    'You have reached the top',
    'of everything.',
  ],
  [
    'THE FIRST LIGHT',
    '',
    'For a hundred nights,',
    'the temple has known',
    'only fire and shadow.',
    '',
    'Not tonight.',
    '',
    'Somewhere past the storm,',
    'the sky is turning gray,',
    'then gold.',
    '',
    'The gate stands open.',
    '',
    'The wall behind you',
    'is only a wall now -',
    'just stone, just still.',
    '',
    'Ahead, for the first time,',
    'there is only light.',
  ],
  [
    'WHERE SHADOWS FALL',
    '',
    'The ember light is fading.',
    '',
    'Something ancient',
    'has stopped watching.',
    '',
    'For the first time',
    'in a hundred years,',
    'the temple is silent.',
    '',
    'No storm.',
    'No flame.',
    'No guardian in the dark.',
    '',
    'Only quiet.',
    '',
    'Only you.',
  ],
  [
    'THE FORGOTTEN PROPHECY',
    '',
    'An old scroll,',
    'long since turned to ash,',
    'spoke of this night.',
    '',
    '"One will come,',
    'running where none should run,',
    'climbing where none',
    'should climb."',
    '',
    'The monks who wrote it',
    'are long gone.',
    '',
    'But the wall remembers',
    'every hand that ever touched it.',
    '',
    'Tonight, it remembers yours.',
  ],
];

function pickEndingCreditsLines(): string[] {
  const index = Math.floor(Math.random() * ENDING_CREDITS_VARIANTS.length);
  return ENDING_CREDITS_VARIANTS[index];
}
const shuriken = new ShurikenTransition();
const scoreState = createScoreState();

// Banks whatever chain is pending, and if that pushes the run's total past
// the player's personal best, fires off a (fire-and-forget) submission to
// the global leaderboard. Kept out of score.ts so that module stays a pure
// local-scoring module with no network dependency.
function bankAndMaybeSubmit() {
  const before = scoreState.highScore;
  bankPendingScore(scoreState);
  if (scoreState.highScore > before) {
    void submitScore(scoreState.highScore);
  }
}

const player: PlayerState = {
  x: level.playerStart.x,
  y: level.playerStart.y,
  vx: 0,
  vy: 0,
  width: 24,
  height: 40,
  grounded: false,
  facing: 1,
  onWall: false,
  wallDirection: null,
  coyoteTime: 0,
  wallJumpCooldown: 0,
  doubleJumpAvailable: true,
  doubleJumpFxTimer: 0,
  visitedCorners: new Set<string>(),
  victory: false,
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  scale = Math.min(width / viewport.width, height / viewport.height);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updateVisitedCorners() {
  const corners = [
    [player.x, player.y],
    [player.x + player.width, player.y],
    [player.x, player.y + player.height],
    [player.x + player.width, player.y + player.height],
  ];
  for (const [x, y] of corners) {
    if (x < 24 || y < 24 || x > level.width - 24 || y > level.height - 24) {
      player.visitedCorners.add(`${Math.round(x / 120)}:${Math.round(y / 120)}`);
    }
  }
}

function handleJump() {
  if (player.wallJumpCooldown > 0) return;
  if (player.grounded || player.coyoteTime > 0) {
    player.vy = -11.2;
    player.grounded = false;
    player.coyoteTime = 0;
    player.doubleJumpAvailable = true;
    playJump();
    return;
  }
  if (player.onWall && player.wallDirection) {
    player.vy = -11.2;
    player.vx = player.wallDirection * 7.4;
    player.facing = player.wallDirection;
    player.onWall = false;
    player.wallDirection = null;
    player.wallJumpCooldown = 14;
    player.doubleJumpAvailable = true;
    registerWallJump(scoreState, player.x + player.width / 2, player.y);
    playWallJump();
    return;
  }
  if (player.doubleJumpAvailable) {
    player.vy = -10.2;
    player.doubleJumpAvailable = false;
    player.doubleJumpFxTimer = DOUBLE_JUMP_FX_FRAMES;
    playDoubleJump();
  }
}

function updatePlayer(dt: number) {
  let moveInput = 0;
  if (keyboard.left) moveInput -= 1;
  if (keyboard.right) moveInput += 1;

  if (player.wallJumpCooldown > 0) {
    // Briefly protect a fresh wall-jump kick from being instantly
    // overridden by input the player was already holding (e.g. still
    // pressing into the wall at the moment they jumped) - let it coast on
    // its own momentum for a beat so there's time to react on purpose
    // before a press (same direction or opposite) takes over again.
    player.vx *= 0.9;
  } else if (moveInput !== 0) {
    // Snap straight to top speed - covers both "ramp up faster" and
    // "reverse direction instantly", since there's no gradual accel to
    // fight through in either case, on the ground or in the air.
    player.vx = moveInput * 4.8;
    player.facing = moveInput > 0 ? 1 : -1;
  } else if (player.grounded) {
    // No slide-to-a-stop on the ground: releasing the input kills
    // horizontal speed immediately.
    player.vx = 0;
  } else {
    // Airborne with no input held still decays gradually, so jump arcs
    // and wall-jump kicks keep their momentum instead of dying instantly.
    player.vx *= 0.9;
  }

  if (player.grounded && moveInput !== 0) {
    footstepTimer -= dt;
    if (footstepTimer <= 0) {
      playFootstep();
      footstepTimer = FOOTSTEP_INTERVAL;
    }
  } else {
    // Not running right now - next step after stopping/landing plays
    // immediately instead of waiting out whatever was left on the clock.
    footstepTimer = 0;
  }

  if (player.coyoteTime > 0) {
    player.coyoteTime -= 1;
  }
  if (player.wallJumpCooldown > 0) {
    player.wallJumpCooldown -= 1;
  }
  if (player.doubleJumpFxTimer > 0) {
    player.doubleJumpFxTimer -= 1;
  }

  if (keyboard.jumpQueued) {
    if (player.grounded || player.coyoteTime > 0 || player.onWall || player.doubleJumpAvailable) {
      handleJump();
    }
    keyboard.jumpQueued = false;
  }

  const gravity = 0.3;
  player.vy += gravity * dt;
  // Terminal velocity: without this, a long uncontrolled fall lets vy grow
  // without bound, and a single frame's movement can end up larger than a
  // platform is tall - see the tunneling guard below for the other half
  // of this fix.
  player.vy = Math.min(player.vy, 20);
  player.vx *= 0.97;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.onWall = false;
  player.wallDirection = null;
  player.grounded = false;

  for (const platform of level.platforms) {
    const prevX = player.x - player.vx * dt;
    const prevY = player.y - player.vy * dt;
    const prevBottom = prevY + player.height;
    const prevRight = prevX + player.width;
    const prevLeft = prevX;
    const prevTop = prevY;
    const nextRight = player.x + player.width;
    const nextLeft = player.x;
    const nextBottom = player.y + player.height;
    const nextTop = player.y;

    // Tunneling guard: a fast fall can carry the player clean through a
    // thin platform in one frame, so their end-of-frame rect never
    // actually overlaps it and the plain check below never fires. Catch
    // that by checking whether this frame's downward path crossed the
    // platform's top surface at all, regardless of where they ended up.
    if (
      player.vy > 0 &&
      nextRight > platform.x &&
      nextLeft < platform.x + platform.w &&
      prevBottom <= platform.y &&
      nextBottom >= platform.y
    ) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
      player.coyoteTime = 6;
      player.doubleJumpAvailable = true;
      player.doubleJumpFxTimer = 0;
      bankAndMaybeSubmit();
      continue;
    }

    // Same idea, sideways: a fast wall-kick (or a slow/dropped frame with a
    // large dt) can carry the player clean through a thin wall in one
    // frame with no end-of-frame overlap to catch below.
    if (
      player.vx > 0 &&
      nextBottom > platform.y &&
      nextTop < platform.y + platform.h &&
      prevRight <= platform.x &&
      nextRight >= platform.x
    ) {
      player.x = platform.x - player.width;
      player.vx = 0;
      player.onWall = true;
      player.wallDirection = -1 as Direction;
      player.doubleJumpFxTimer = 0;
      continue;
    }
    if (
      player.vx < 0 &&
      nextBottom > platform.y &&
      nextTop < platform.y + platform.h &&
      prevLeft >= platform.x + platform.w &&
      nextLeft <= platform.x + platform.w
    ) {
      player.x = platform.x + platform.w;
      player.vx = 0;
      player.onWall = true;
      player.wallDirection = 1 as Direction;
      player.doubleJumpFxTimer = 0;
      continue;
    }

    if (!rectsOverlap(player.x, player.y, player.width, player.height, platform.x, platform.y, platform.w, platform.h)) {
      continue;
    }

    const overlapLeft = Math.min(nextRight, platform.x + platform.w) - Math.max(nextLeft, platform.x);
    const overlapRight = Math.min(nextBottom, platform.y + platform.h) - Math.max(nextTop, platform.y);

    if (overlapLeft < overlapRight) {
      if (prevRight <= platform.x + 1) {
        player.x = platform.x - player.width;
        player.vx = 0;
        player.onWall = true;
        player.wallDirection = -1 as Direction;
        player.doubleJumpFxTimer = 0;
      } else if (prevLeft >= platform.x + platform.w - 1) {
        player.x = platform.x + platform.w;
        player.vx = 0;
        player.onWall = true;
        player.wallDirection = 1 as Direction;
        player.doubleJumpFxTimer = 0;
      } else {
        // Neither previous-position check could tell which side the
        // player approached from (a corner, or a frame that left them
        // already partially embedded) - rather than leaving the overlap
        // completely unresolved, push out along whichever side is
        // currently closer so they're never left stuck inside solid
        // geometry.
        const playerCenterX = nextLeft + player.width / 2;
        const platformCenterX = platform.x + platform.w / 2;
        if (playerCenterX < platformCenterX) {
          player.x = platform.x - player.width;
          player.wallDirection = -1 as Direction;
        } else {
          player.x = platform.x + platform.w;
          player.wallDirection = 1 as Direction;
        }
        player.vx = 0;
        player.onWall = true;
        player.doubleJumpFxTimer = 0;
      }
    } else {
      if (prevBottom <= platform.y + 1) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.grounded = true;
        player.coyoteTime = 6;
        player.doubleJumpAvailable = true;
        player.doubleJumpFxTimer = 0;
        bankAndMaybeSubmit();
      } else if (prevTop >= platform.y + platform.h - 1) {
        player.y = platform.y + platform.h;
        player.vy = 0;
      } else {
        // Same fallback as above, for the vertical axis.
        const playerCenterY = nextTop + player.height / 2;
        const platformCenterY = platform.y + platform.h / 2;
        if (playerCenterY < platformCenterY) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.grounded = true;
          player.coyoteTime = 6;
          player.doubleJumpAvailable = true;
          bankAndMaybeSubmit();
        } else {
          player.y = platform.y + platform.h;
          player.vy = 0;
        }
        player.doubleJumpFxTimer = 0;
      }
    }
  }

  if (player.y > level.height + 80) {
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.doubleJumpAvailable = true;
    player.visitedCorners.clear();
    discardPendingScore(scoreState);
  }

  if (!player.grounded && player.vy > 0) {
    player.grounded = false;
  }

  if (player.grounded && Math.abs(player.vx) < 0.02) {
    player.vx = 0;
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > level.width) player.x = level.width - player.width;

  updateVisitedCorners();

  const dx = player.x - level.goal.x;
  const dy = player.y - level.goal.y;
  if (Math.hypot(dx, dy) < level.goal.r + 12) {
    player.victory = true;
  }

  cameraY = clamp(player.y + player.height / 2 - viewport.height * 0.64, 0, level.height - viewport.height);
}

// --- Level lifecycle --------------------------------------------------

// Levels 1-5 (forest), 6-10 (city), 11-15 (mountain), and 16-19 (temple)
// each share one music track per group; level 20 - the final gate - gets
// its own distinct track rather than continuing the temple group's.
function trackForLevel(levelId: number): MusicTrack {
  if (levelId >= 20) return 'finalLevel';
  if (levelId >= 16) return 'temple';
  if (levelId >= 11) return 'mountain';
  if (levelId >= 6) return 'city';
  return 'forest';
}

function enterLevel(index: number) {
  currentLevelIndex = ((index % LEVELS.length) + LEVELS.length) % LEVELS.length;
  level = LEVELS[currentLevelIndex];
  lanternSpots = computeLanternSpots(level);
  void playMusicTrack(trackForLevel(level.id));

  // Looping back to the first level starts a fresh attempt at the high
  // score; a chain can't survive a level transition either way.
  if (currentLevelIndex === 0) {
    resetRun(scoreState);
  } else {
    discardPendingScore(scoreState);
  }

  player.x = level.playerStart.x;
  player.y = level.playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.onWall = false;
  player.wallDirection = null;
  player.coyoteTime = 0;
  player.wallJumpCooldown = 0;
  player.doubleJumpAvailable = true;
  player.doubleJumpFxTimer = 0;
  player.visitedCorners.clear();
  player.victory = false;

  cameraY = clamp(player.y + player.height / 2 - viewport.height * 0.64, 0, level.height - viewport.height);

  keyboard.jumpQueued = false;
  keyboard.left = false;
  keyboard.right = false;
  keyboard.jump = false;

  phase = 'intro';
  phaseTimer = 0;
  introBanner.show(`Level ${level.id}`, { inDur: 0.4, holdDur: 1.0, outDur: 0.4 });
}

function triggerVictorySequence() {
  phase = 'victory';
  phaseTimer = 0;
  shurikenFired = false;
  victoryBanner.show('Great', { inDur: 0.3, holdDur: 0.8, outDur: 0.3, color: '#c0392b' });
}

function triggerEndingSequence() {
  phase = 'ending';
  phaseTimer = 0;
  gameChromeEl.hidden = true;
  stopMusic(); // hard cut, not a fade - the silence is part of the freeze beat
  const goalScreenX = (level.goal.x) * scale;
  const goalScreenY = (level.goal.y - cameraY) * scale;
  // The continue button stays in normal layout (see .ending-continue in
  // index.html) even while invisible, so its position can be read here to
  // have the crawl start right above it instead of off-screen.
  const creditsStartY = endingContinueEl.getBoundingClientRect().top - 24;
  endingSequence.start(goalScreenX, goalScreenY, pickEndingCreditsLines(), creditsStartY);
  lastEndingStage = null;
}

// Called when the player presses Continue after the credits crawl has
// finished - deliberately not automatic, so the ending holds until the
// player is ready to leave it rather than dumping them back at the menu.
function returnToMenuFromEnding() {
  phase = 'menu';
  stopRumble(); // safety net - normally already stopped when 'shake' ends
  menuScreenEl.hidden = false;
  menuBanner.show('Ninja Wall Runner', { inDur: 0.6, holdDur: 999999, outDur: 0.6, color: '#e8d4a0' });
  void playMusicTrack('menu');
}

// --- Rendering ----------------------------------------------------------

let elapsed = 0;

// Evenly spaced, alternating sides, scaled to whichever level is loaded -
// avoids baking one level's specific chamber coordinates into decoration
// that has to look right across all of them.
let lanternSpots: Array<{ x: number; y: number }> = [];

function computeLanternSpots(lvl: Level): Array<{ x: number; y: number }> {
  const count = 5;
  const spots: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= count; i++) {
    spots.push({ x: i % 2 === 0 ? 400 : 40, y: lvl.height * (i / (count + 1)) });
  }
  return spots;
}

function drawBackground() {
  switch (level.group) {
    case 'city':
      drawCitySky(ctx, width, height);
      drawSkyline(ctx, width, height, cameraY);
      drawHaze(ctx, width, height, elapsed);
      break;
    case 'mountain':
      drawMountainSky(ctx, width, height, elapsed);
      drawPeaks(ctx, width, height, cameraY);
      drawStormClouds(ctx, width, height, elapsed);
      break;
    case 'temple':
      drawTempleSky(ctx, width, height, elapsed);
      drawTempleSkyline(ctx, width, height, cameraY, level.groupLevelNumber);
      drawEmberHaze(ctx, width, height, elapsed);
      break;
    default:
      drawForestSky(ctx, width, height);
      drawMountains(ctx, width, height, cameraY);
      drawMist(ctx, width, height, elapsed);
      break;
  }
}

function drawWorld() {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0, -cameraY);

  switch (level.group) {
    case 'city':
      drawAlleyClutter(ctx, level, cameraY, viewport.height);
      break;
    case 'mountain':
      drawCliffside(ctx, level, cameraY, viewport.height);
      break;
    case 'temple':
      drawRuinClutter(ctx, level, cameraY, viewport.height);
      break;
    default:
      drawBambooGrove(ctx, level, cameraY, viewport.height);
      break;
  }

  for (const platform of level.platforms) {
    switch (level.group) {
      case 'city':
        drawCityPlatform(ctx, platform);
        break;
      case 'mountain':
        drawMountainPlatform(ctx, platform);
        break;
      case 'temple':
        drawTemplePlatform(ctx, platform);
        break;
      default:
        drawForestPlatform(ctx, platform);
        break;
    }
  }

  switch (level.group) {
    case 'city':
      drawShrineGate(ctx, level.goal.x, level.goal.y + 70, 0.85);
      for (const spot of lanternSpots) {
        drawNeonSign(ctx, spot.x, spot.y, elapsed * 2 + spot.x);
      }
      break;
    case 'mountain':
      drawStormGate(ctx, level.goal.x, level.goal.y + 70, 0.85);
      for (const spot of lanternSpots) {
        drawPrayerLantern(ctx, spot.x, spot.y, elapsed * 2 + spot.x);
      }
      break;
    case 'temple':
      drawFinalGate(ctx, level.goal.x, level.goal.y + 70, 0.85, level.groupLevelNumber);
      for (const spot of lanternSpots) {
        drawSpiritFlame(ctx, spot.x, spot.y, elapsed * 2 + spot.x);
      }
      break;
    default:
      drawToriiGate(ctx, level.goal.x, level.goal.y + 70, 0.85);
      for (const spot of lanternSpots) {
        drawLantern(ctx, spot.x, spot.y, elapsed * 2 + spot.x);
      }
      break;
  }

  const gx = level.goal.x;
  const gy = level.goal.y;
  const gr = level.goal.r;
  const pulse = 1 + Math.sin(elapsed * 3) * 0.08;
  const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr * 2.2);
  const glowColor = player.victory ? '255,210,140' : '255,225,140';
  glow.addColorStop(0, `rgba(${glowColor},0.8)`);
  glow.addColorStop(1, `rgba(${glowColor},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(gx - gr * 2.2, gy - gr * 2.2, gr * 4.4, gr * 4.4);
  ctx.beginPath();
  ctx.arc(gx, gy, gr * pulse, 0, Math.PI * 2);
  ctx.fillStyle = player.victory ? '#7fffd4' : '#ffdf8a';
  ctx.fill();

  let flipX = player.facing < 0;
  let rotation = 0;
  let scaleX = 1;
  let scaleY = 1;

  if (phase === 'victory' || phase === 'ending') {
    // Hold on the same reaching pose used for the double-jump flourish -
    // reads as "wound up to throw" without needing a dedicated animation.
    ninjaSprite.hold('jump', ninjaReachFrame(), 1);
  } else {
    const pose = pickNinjaPose({
      facing: player.facing,
      grounded: player.grounded,
      onWall: player.onWall,
      wallDirection: player.wallDirection,
      vx: player.vx,
      vy: player.vy,
      doubleJumpFxTimer: player.doubleJumpFxTimer,
    });
    if (pose.holding) {
      ninjaSprite.hold(pose.clip, ninjaReachFrame(), 1);
    } else {
      ninjaSprite.play(pose.clip);
    }
    flipX = pose.flipX;
    rotation = pose.rotation;
    scaleX = pose.scaleX;
    scaleY = pose.scaleY;
    if (pose.reachStrength > 0) {
      drawReachBurst(ctx, player.x + player.width / 2, player.y + player.height - player.height * 1.6, player.facing, pose.reachStrength);
    }
  }
  const spriteX = player.x + player.width / 2;
  const spriteY = player.y + player.height;
  ninjaSprite.draw(ctx, spriteX, spriteY, {
    flipX,
    rotation,
    scaleX: NINJA_RENDER_SCALE * scaleX,
    scaleY: NINJA_RENDER_SCALE * scaleY,
  });

  drawComboFx(ctx, scoreState, player.x + player.width / 2, player.y);

  ctx.restore();
}

// --- Main menu: dressed in the forest theme (the game's "front door")
// with a static camera - same background/decoration functions the forest
// levels use, just with no scrolling and a calligraphy title standing in
// where a level's platforms would be.
function drawMenuBackground() {
  drawForestSky(ctx, width, height);
  drawMountains(ctx, width, height, 0);
  drawMist(ctx, width, height, elapsed);
}

function drawMenuScene() {
  ctx.save();
  // The virtual 480x720 viewport only exactly fills one axis of the real
  // screen (scale is a min() of the two ratios) - on anything wider or
  // taller than that 2:3 shape (iPad, desktop browser, etc.) the leftover
  // space would otherwise sit unused on one side, pushing the gate/title
  // off-center. Center the scaled content within whatever room is left on
  // each axis instead of anchoring it to the top-left corner.
  const offsetX = (width - viewport.width * scale) / 2;
  const offsetY = (height - viewport.height * scale) / 2;
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawBambooGrove(ctx, { width: viewport.width }, 0, viewport.height);
  drawLantern(ctx, 56, 560, elapsed * 2 + 56);
  drawLantern(ctx, viewport.width - 56, 560, elapsed * 2 + viewport.width);
  drawToriiGate(ctx, viewport.width / 2, 560, 1.3);

  menuBanner.draw(ctx, viewport.width / 2, 230, viewport.width * 0.88, 220);

  ctx.restore();
}

function drawHud() {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Level ${level.id} - Climb higher: ${Math.round(player.y)} / ${level.height}`, 18, 28);
  if (phase === 'playing') {
    ctx.fillText('Climb, wall-jump, and double-jump to the summit', 18, 50);
  }
  drawScoreHud(ctx, width, scoreState);
}

function drawSequenceOverlays() {
  const cx = width / 2;
  const cy = height / 2;
  introBanner.draw(ctx, cx, cy, width * 0.9, height * 0.4);
  victoryBanner.draw(ctx, cx, cy, width * 0.92, height * 0.45);
  shuriken.draw(ctx, width, height);
}

function update(dt: number) {
  if (phase === 'playing') {
    updatePlayer(dt);
    if (player.victory) {
      bankAndMaybeSubmit();
      playGoal();
      if (currentLevelIndex === LEVELS.length - 1) {
        triggerEndingSequence();
      } else {
        triggerVictorySequence();
      }
    }
  } else if (phase === 'intro') {
    phaseTimer += dt / 60;
    if (phaseTimer > introBanner.totalDuration + 0.15) {
      phase = 'playing';
    }
  } else if (phase === 'victory') {
    phaseTimer += dt / 60;
    if (phaseTimer > 0.5 && !shurikenFired) {
      shurikenFired = true;
      const originX = (player.x + player.width / 2) * scale;
      const originY = (player.y + player.height * 0.3 - cameraY) * scale;
      shuriken.start(originX, originY, () => {
        enterLevel(currentLevelIndex + 1);
      });
    }
  } else if (phase === 'ending') {
    endingSequence.update(dt);
    const endingStage = endingSequence.stage;
    if (endingStage !== lastEndingStage) {
      if (endingStage === 'shake') {
        startRumble();
      } else if (lastEndingStage === 'shake') {
        stopRumble();
      }
      if (endingStage === 'flash') {
        playExplosion();
      }
      if (endingStage === 'credits') {
        void playMusicTrack('credits');
      }
      lastEndingStage = endingStage;
    }
    // Visible for the whole credits crawl (not just once it finishes) so
    // the player can skip straight to the menu instead of waiting it out.
    endingContinueEl.classList.toggle('visible', endingStage === 'credits' || endingStage === 'done');
  }

  introBanner.update(dt);
  victoryBanner.update(dt);
  menuBanner.update(dt);
  shuriken.update(dt);
  if (phase !== 'ending') {
    ninjaSprite.update(dt);
  }
  updateScoreFx(scoreState, dt);
  elapsed += dt / 60;
}

function render() {
  if (phase === 'menu') {
    drawMenuBackground();
    drawMenuScene();
    return;
  }
  if (phase === 'ending') {
    renderEnding();
    return;
  }
  drawBackground();
  drawWorld();
  drawHud();
  drawSequenceOverlays();
}

function renderEnding() {
  const stage = endingSequence.stage;
  if (stage === 'freeze' || stage === 'shake') {
    const shake = endingSequence.shakeOffset;
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawBackground();
    drawWorld();
    ctx.restore();
  }
  endingSequence.draw(ctx, width, height);
}

function loop(time: number) {
  const dt = Math.min(1.4, (time - lastTime) / 16.6667) || 1;
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Wires an on-screen button to hold-while-pressed semantics (mirrors
// keydown/keyup), using Pointer Events so touch, mouse, and pen all work
// through one code path. Pointer capture keeps the release reliable even
// if the finger drifts off the button before lifting.
function attachHoldButton(id: string, onPress: () => void, onRelease: () => void) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    el.setPointerCapture(event.pointerId);
    onPress();
  });

  const release = () => onRelease();
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
}

function attachInput() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') keyboard.left = true;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') keyboard.right = true;
    if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
      if (!keyboard.jump) {
        keyboard.jump = true;
        keyboard.jumpQueued = true;
      }
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') keyboard.left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') keyboard.right = false;
    if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') keyboard.jump = false;
  });

  attachHoldButton('btnLeft', () => { keyboard.left = true; }, () => { keyboard.left = false; });
  attachHoldButton('btnRight', () => { keyboard.right = true; }, () => { keyboard.right = false; });
  attachHoldButton(
    'btnJump',
    () => {
      if (!keyboard.jump) {
        keyboard.jump = true;
        keyboard.jumpQueued = true;
      }
    },
    () => { keyboard.jump = false; },
  );
}

function attachLeaderboardUI() {
  const toggle = document.getElementById('leaderboardToggle') as HTMLButtonElement;
  const leaderboardPanel = document.getElementById('leaderboardPanel') as HTMLDivElement;
  const leaderboardList = document.getElementById('leaderboardList') as HTMLDivElement;
  const leaderboardClose = document.getElementById('leaderboardClose') as HTMLButtonElement;
  const editNicknameBtn = document.getElementById('editNickname') as HTMLButtonElement;

  const nicknamePrompt = document.getElementById('nicknamePrompt') as HTMLDivElement;
  const nicknameInput = document.getElementById('nicknameInput') as HTMLInputElement;
  const nicknameSave = document.getElementById('nicknameSave') as HTMLButtonElement;
  const nicknameSkip = document.getElementById('nicknameSkip') as HTMLButtonElement;

  function showNicknamePrompt() {
    leaderboardPanel.hidden = true;
    nicknameInput.value = getNickname() ?? '';
    nicknamePrompt.hidden = false;
    nicknameInput.focus();
  }

  function hideNicknamePrompt() {
    nicknamePrompt.hidden = true;
  }

  nicknameSave.addEventListener('click', () => {
    const value = nicknameInput.value.trim();
    if (value.length > 0) {
      setNickname(value);
    } else {
      ensureNickname();
    }
    markPromptedForNickname();
    hideNicknamePrompt();
    // Push the rename to the leaderboard immediately if there's already a
    // banked score sitting under this device's row.
    if (scoreState.highScore > 0) {
      void submitScore(scoreState.highScore);
    }
  });

  nicknameSkip.addEventListener('click', () => {
    ensureNickname();
    markPromptedForNickname();
    hideNicknamePrompt();
  });

  function renderLeaderboardList(entries: Awaited<ReturnType<typeof fetchTopScores>>) {
    leaderboardList.replaceChildren();
    if (!isLeaderboardEnabled()) {
      const empty = document.createElement('div');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'Leaderboard not configured yet.';
      leaderboardList.appendChild(empty);
      return;
    }
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'leaderboard-empty';
      empty.textContent = 'No scores yet - be the first!';
      leaderboardList.appendChild(empty);
      return;
    }
    const myDeviceId = getDeviceId();
    entries.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row' + (entry.deviceId === myDeviceId ? ' me' : '');
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = `#${i + 1}`;
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = entry.nickname;
      const score = document.createElement('span');
      score.className = 'leaderboard-score';
      score.textContent = entry.score.toLocaleString();
      row.append(rank, name, score);
      leaderboardList.appendChild(row);
    });
  }

  async function openLeaderboardPanel() {
    hideNicknamePrompt();
    leaderboardPanel.hidden = false;
    leaderboardList.replaceChildren();
    const loading = document.createElement('div');
    loading.className = 'leaderboard-empty';
    loading.textContent = 'Loading…';
    leaderboardList.appendChild(loading);
    const entries = await fetchTopScores(10);
    renderLeaderboardList(entries);
  }

  toggle.addEventListener('click', () => {
    void openLeaderboardPanel();
  });

  leaderboardClose.addEventListener('click', () => {
    leaderboardPanel.hidden = true;
  });

  editNicknameBtn.addEventListener('click', () => {
    showNicknamePrompt();
  });

  // One-time nickname prompt. Only bothers if there's actually a
  // leaderboard to submit to; callers decide when it's a good moment to
  // show it (e.g. a beat after the player actually starts playing).
  function maybeShowNicknamePrompt() {
    if (isLeaderboardEnabled() && !hasBeenPromptedForNickname()) {
      setTimeout(showNicknamePrompt, 2000);
    }
  }

  return { openLeaderboardPanel, maybeShowNicknamePrompt };
}

// Testing aid: visiting the page with ?startLevel=<id> makes Play jump
// straight to that level instead of level 1 - handy for checking anything
// late-game (like the ending sequence) without replaying the whole thing.
function getDebugStartLevelIndex(): number | null {
  const raw = new URLSearchParams(window.location.search).get('startLevel');
  if (!raw) return null;
  const levelId = parseInt(raw, 10);
  const index = LEVELS.findIndex((l) => l.id === levelId);
  return index >= 0 ? index : null;
}

function attachMenuUI(leaderboard: ReturnType<typeof attachLeaderboardUI>) {
  const menuPlay = document.getElementById('menuPlay') as HTMLButtonElement;
  const menuLeaderboard = document.getElementById('menuLeaderboard') as HTMLButtonElement;
  const menuHowTo = document.getElementById('menuHowTo') as HTMLButtonElement;
  const howToPanel = document.getElementById('howToPanel') as HTMLDivElement;
  const howToClose = document.getElementById('howToClose') as HTMLButtonElement;

  menuPlay.addEventListener('click', () => {
    unlockAudio();
    void playGong();
    menuScreenEl.hidden = true;
    gameChromeEl.hidden = false;
    enterLevel(getDebugStartLevelIndex() ?? 0); // also switches music to the right track
    leaderboard.maybeShowNicknamePrompt();
  });

  menuLeaderboard.addEventListener('click', () => {
    void leaderboard.openLeaderboardPanel();
  });

  menuHowTo.addEventListener('click', () => {
    howToPanel.hidden = false;
  });

  howToClose.addEventListener('click', () => {
    howToPanel.hidden = true;
  });

  endingContinueEl.addEventListener('click', () => {
    endingContinueEl.classList.remove('visible');
    returnToMenuFromEnding();
  });
}

// Only show the on-screen movement/jump buttons on touch-primary devices
// (phones, tablets) - anything whose primary pointer is a mouse/trackpad
// (laptops, desktops) already has the keyboard controls, so the buttons
// would just be redundant screen clutter. `pointer: coarse` is the
// standard feature-detection signal for "the main input is a finger, not
// a mouse" - it correctly reads iPadOS as touch-primary even though it
// reports a desktop-class user agent.
function isTouchPrimaryDevice(): boolean {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches;
  }
  return navigator.maxTouchPoints > 0;
}

function applyControlSchemeForDevice() {
  if (isTouchPrimaryDevice()) return;
  const dpad = document.getElementById('dpad');
  const jumpBtn = document.getElementById('btnJump');
  const hudText = document.getElementById('hudText');
  if (dpad) dpad.hidden = true;
  if (jumpBtn) jumpBtn.hidden = true;
  if (hudText) hudText.textContent = 'Ninja Wall Runner · Arrow keys to move · Space to jump';
}

// Same autoplay-gesture constraint as everywhere else in this file: try to
// start the menu music immediately, and if the browser blocks it (no user
// gesture yet - the common case on mobile), fall back to starting it on
// the player's very first tap/click/key anywhere on the page.
function playMenuMusicWithFallback() {
  playMusicTrack('menu').then((played) => {
    if (played) return;
    const retry = () => {
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      void playMusicTrack('menu');
    };
    window.addEventListener('pointerdown', retry, { once: true });
    window.addEventListener('keydown', retry, { once: true });
  });
}

window.addEventListener('resize', resize);
window.addEventListener('load', () => {
  resize();
  attachInput();
  applyControlSchemeForDevice();
  const leaderboard = attachLeaderboardUI();
  attachMenuUI(leaderboard);
  menuBanner.show('Ninja Wall Runner', { inDur: 0.6, holdDur: 999999, outDur: 0.6, color: '#e8d4a0' });
  playMenuMusicWithFallback();
  Promise.all([
    document.fonts.load(`64px MaShanZheng`),
    document.fonts.load(`88px MaShanZheng`),
    document.fonts.load(`28px DelaGothicOne`),
  ]).catch(() => {}).finally(() => {
    requestAnimationFrame(loop);
  });
});
