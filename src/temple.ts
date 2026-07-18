// Ancient temple theme: the climax of the game. A burning, crumbling
// temple complex with something massive and shadowed looming closer with
// every level, culminating at the final gate. Drawn entirely procedurally,
// same approach as forest.ts/city.ts/mountain.ts - no external art assets.

type Platform = { x: number; y: number; w: number; h: number };

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// --- Inferno sky + ember flare -----------------------------------------

// Static for a given canvas size, so bake once and blit - same reasoning as
// the other three themes' drawSky. The ember flare, like mountain's
// lightning, is a cheap alpha-pulse overlay on top of the cached bitmap.
let skyCache: HTMLCanvasElement | null = null;
let skyCacheKey = '';

export function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const key = `${width}x${height}`;
  if (!skyCache || skyCacheKey !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const sctx = canvas.getContext('2d')!;

    const sky = sctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0e0507');
    sky.addColorStop(0.4, '#2a0c0f');
    sky.addColorStop(0.75, '#4a1610');
    sky.addColorStop(1, '#7a2a14');
    sctx.fillStyle = sky;
    sctx.fillRect(0, 0, width, height);

    // A hot, heavy glow low on the horizon - the source of the danger.
    const glow = sctx.createLinearGradient(0, height * 0.68, 0, height);
    glow.addColorStop(0, 'rgba(255,120,30,0)');
    glow.addColorStop(1, 'rgba(255,140,30,0.35)');
    sctx.fillStyle = glow;
    sctx.fillRect(0, height * 0.68, width, height * 0.32);

    // Static drifting embers, scattered once and left in place - warm
    // specks rather than a live particle system.
    for (let i = 0; i < 50; i++) {
      const sx = hash(i * 5.3) * width;
      const sy = hash(i * 9.1) * height;
      const b = 0.2 + hash(i * 19.7) * 0.5;
      const size = 1 + hash(i * 3.7) * 1.5;
      sctx.fillStyle = `rgba(255,${140 + Math.floor(hash(i) * 60)},60,${b})`;
      sctx.fillRect(sx, sy, size, size);
    }

    skyCache = canvas;
    skyCacheKey = key;
  }
  ctx.drawImage(skyCache, 0, 0);

  // Ember flare: a rare, brief warm flash - a heat-shimmer punctuation,
  // same cheap technique as the mountain group's lightning.
  const cycle = time % 5.2;
  if (cycle < 0.18) {
    const flash = Math.sin((cycle / 0.18) * Math.PI) * 0.18;
    ctx.fillStyle = `rgba(255,150,60,${flash})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// --- Crumbling pagoda skyline + looming guardian ----------------------------

// Two layers of broken pagoda roofline silhouettes, plus a massive shadowed
// guardian figure whose presence (opacity + size) grows with the level
// number within the group - the "getting closer to the boss" escalation
// across the five temple levels. Cached per canvas size + intensity, same
// regen-threshold trick as the other themes' parallax layers.
type RuinLayerCache = { canvas: HTMLCanvasElement; offset: number };
const ruinCache = new Map<number, RuinLayerCache>();
const RUIN_REGEN_THRESHOLD = 1.5;

let guardianCache: { canvas: HTMLCanvasElement; key: string } | null = null;

function renderGuardian(width: number, height: number, intensity: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const gctx = canvas.getContext('2d')!;

  const cx = width * 0.72;
  const groundY = height * (0.78 - intensity * 0.1);
  const scale = 0.5 + intensity * 0.9;
  const alpha = 0.12 + intensity * 0.4;

  gctx.save();
  gctx.globalAlpha = alpha;
  gctx.translate(cx, groundY);
  gctx.scale(scale, scale);

  gctx.fillStyle = '#1a0808';
  // Cloak/body.
  gctx.beginPath();
  gctx.moveTo(-70, 0);
  gctx.quadraticCurveTo(-90, -160, -30, -260);
  gctx.quadraticCurveTo(0, -300, 30, -260);
  gctx.quadraticCurveTo(90, -160, 70, 0);
  gctx.closePath();
  gctx.fill();

  // Horns.
  gctx.beginPath();
  gctx.moveTo(-22, -250);
  gctx.quadraticCurveTo(-40, -300, -18, -320);
  gctx.quadraticCurveTo(-20, -290, -8, -252);
  gctx.closePath();
  gctx.fill();
  gctx.beginPath();
  gctx.moveTo(22, -250);
  gctx.quadraticCurveTo(40, -300, 18, -320);
  gctx.quadraticCurveTo(20, -290, 8, -252);
  gctx.closePath();
  gctx.fill();

  // Glowing eyes - the one warm accent on an otherwise pitch-dark figure.
  gctx.globalAlpha = alpha * 1.6;
  gctx.fillStyle = 'rgba(255,90,40,0.9)';
  gctx.beginPath();
  gctx.ellipse(-14, -230, 6, 3, 0, 0, Math.PI * 2);
  gctx.fill();
  gctx.beginPath();
  gctx.ellipse(14, -230, 6, 3, 0, 0, Math.PI * 2);
  gctx.fill();

  gctx.restore();
  return canvas;
}

export function drawTempleSkyline(ctx: CanvasRenderingContext2D, width: number, height: number, cameraY: number, levelNumber: number) {
  const layers = [
    { color: '#1c0e10', speed: 0.02, base: 0.58, buildingW: 80 },
    { color: '#2a1614', speed: 0.05, base: 0.7, buildingW: 60 },
  ];
  layers.forEach((layer, index) => {
    const offset = cameraY * layer.speed;
    let cached = ruinCache.get(index);
    const sizeChanged = cached && (cached.canvas.width !== width || cached.canvas.height !== height);
    if (!cached || sizeChanged || Math.abs(offset - cached.offset) > RUIN_REGEN_THRESHOLD) {
      const canvas = cached && !sizeChanged ? cached.canvas : document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const lctx = canvas.getContext('2d')!;
      lctx.clearRect(0, 0, width, height);

      const count = Math.ceil(width / layer.buildingW) + 2;
      for (let i = 0; i < count; i++) {
        const bx = i * layer.buildingW - (offset % layer.buildingW);
        const seed = i * 37 + index * 613;
        const h = height * layer.base - hash(seed) * height * 0.25;
        const bw = layer.buildingW - 8;
        const by = height - h;
        lctx.fillStyle = layer.color;
        lctx.fillRect(bx, by, bw, h + 4);

        // A pagoda roof cap: a broken, jagged triangular silhouette.
        lctx.beginPath();
        lctx.moveTo(bx - 6, by);
        lctx.lineTo(bx + bw / 2, by - 22 - hash(seed + 9) * 12);
        lctx.lineTo(bx + bw + 6, by);
        lctx.closePath();
        lctx.fill();
      }
      cached = { canvas, offset };
      ruinCache.set(index, cached);
    }
    ctx.drawImage(cached.canvas, 0, 0);
  });

  // The guardian - regenerated only when the intensity band actually
  // changes (i.e. between levels, not frame to frame).
  const intensity = Math.max(0, Math.min(1, (levelNumber - 1) / 4));
  const key = `${width}x${height}x${intensity.toFixed(2)}`;
  if (!guardianCache || guardianCache.key !== key) {
    guardianCache = { canvas: renderGuardian(width, height, intensity), key };
  }
  ctx.drawImage(guardianCache.canvas, 0, 0);
}

// --- Ember haze (screen-space parallax bands) -------------------------------

// Same rigid-pair-baked-to-a-tile trick as the other themes' mist/haze,
// tinted like drifting smoke and cinder.
type SmokeBandCache = { canvas: HTMLCanvasElement; originX: number; originY: number };
const smokeCache = new Map<number, SmokeBandCache>();

export function drawEmberHaze(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const bands = [
    { y: 0.55, speed: 6, alpha: 0.14, color: '120,50,30' },
    { y: 0.8, speed: -9, alpha: 0.18, color: '90,30,20' },
  ];
  bands.forEach((band, index) => {
    let cached = smokeCache.get(index);
    if (!cached || cached.canvas.width !== Math.ceil(width * 1.95)) {
      const originX = width * 0.9;
      const originY = 32;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 1.95);
      canvas.height = 75;
      const mctx = canvas.getContext('2d')!;
      mctx.fillStyle = `rgba(${band.color},${band.alpha})`;
      mctx.beginPath();
      mctx.ellipse(originX - width * 0.2, originY, width * 0.72, 28, 0, 0, Math.PI * 2);
      mctx.ellipse(originX + width * 0.55, originY + 11, width * 0.52, 22, 0, 0, Math.PI * 2);
      mctx.fill();
      cached = { canvas, originX, originY };
      smokeCache.set(index, cached);
    }
    const scrollX = (time * band.speed) % width;
    ctx.drawImage(cached.canvas, scrollX - cached.originX, height * band.y - cached.originY);
  });
}

// --- Background ruin clutter (world-space, slow parallax) ------------------

// Broken stone lanterns and scorched, leaning pillars, tiled and only the
// visible rows drawn - same pattern as the earlier themes' foreground rows.
let ruinTile: HTMLCanvasElement | null = null;

function ensureRuinTile(): HTMLCanvasElement {
  if (ruinTile) return ruinTile;
  const w = 90;
  const h = 170;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const cctx = canvas.getContext('2d')!;

  // A leaning, cracked stone pillar.
  cctx.save();
  cctx.translate(30, h);
  cctx.rotate(-0.08);
  cctx.fillStyle = '#241412';
  cctx.fillRect(-9, -110, 18, 110);
  cctx.strokeStyle = 'rgba(0,0,0,0.5)';
  cctx.lineWidth = 1.5;
  cctx.strokeRect(-9, -110, 18, 110);
  cctx.restore();

  // A broken stone lantern with a faint ember glow.
  cctx.fillStyle = '#2a1512';
  cctx.beginPath();
  cctx.roundRect(58, h - 46, 20, 20, 3);
  cctx.fill();
  cctx.fillRect(56, h - 50, 24, 5);
  const glow = cctx.createRadialGradient(68, h - 38, 2, 68, h - 38, 20);
  glow.addColorStop(0, 'rgba(255,120,50,0.4)');
  glow.addColorStop(1, 'rgba(255,120,50,0)');
  cctx.fillStyle = glow;
  cctx.fillRect(48, h - 58, 40, 40);

  ruinTile = canvas;
  return ruinTile;
}

export function drawRuinClutter(ctx: CanvasRenderingContext2D, level: { width: number }, cameraY: number, viewportHeight: number) {
  const tile = ensureRuinTile();
  const parallax = 0.35;
  const spacing = 150;

  const parallaxShift = cameraY * (1 - parallax);
  const firstRow = Math.floor((cameraY - parallaxShift) / spacing) - 1;
  const lastRow = Math.ceil((cameraY + viewportHeight - parallaxShift) / spacing) + 1;

  ctx.globalAlpha = 0.55;
  for (let r = firstRow; r <= lastRow; r++) {
    const y = r * spacing + parallaxShift;
    for (const xBase of [30, level.width - 30]) {
      ctx.drawImage(tile, xBase - tile.width / 2, y - tile.height);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Platforms: procedural charred temple-ledge texture, baked and cached
// per platform the same way the other themes bake theirs.

const platformTextureCache = new WeakMap<Platform, HTMLCanvasElement>();

function renderPlatformTexture(platform: Platform): HTMLCanvasElement {
  const { x, w, h } = platform;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;

  // Charred wood/stone base.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#4a3228');
  grad.addColorStop(1, '#241614');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Plank seams.
  const seamSpacing = 28;
  ctx.strokeStyle = 'rgba(10,6,4,0.5)';
  ctx.lineWidth = 1.5;
  for (let sx = seamSpacing; sx < w; sx += seamSpacing) {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }

  // Glowing ember cracks.
  const crackCount = Math.max(1, Math.floor(w / 50));
  for (let i = 0; i < crackCount; i++) {
    const seed = Math.floor(x) * 11 + i;
    let cx = 8 + hash(seed) * Math.max(1, w - 16);
    let cy = h * 0.3 + hash(seed + 5) * h * 0.4;
    ctx.strokeStyle = 'rgba(255,110,40,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) {
      cx += (hash(seed + s * 3) - 0.5) * 14;
      cy += hash(seed + s * 7) * 8;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Gold trim along the top edge - the one untouched, ceremonial detail on
  // an otherwise burned structure.
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(0, 0, w, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 4, w, 1);

  ctx.strokeStyle = 'rgba(6,4,3,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  return canvas;
}

export function drawPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  let texture = platformTextureCache.get(platform);
  if (!texture) {
    texture = renderPlatformTexture(platform);
    platformTextureCache.set(platform, texture);
  }
  ctx.drawImage(texture, platform.x, platform.y);
}

// --- Final gate (goal marker) + spirit flames -------------------------------

// The ultimate torii - the same silhouette language every group's goal
// marker has used, but here fully ablaze. Its intensity scales with the
// level number within the group, so the last level's gate (the very end of
// the game) is the most dramatic version of it.
export function drawFinalGate(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale = 1, levelNumber = 5) {
  const intensity = Math.max(0.4, Math.min(1, levelNumber / 5));
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);

  ctx.shadowColor = `rgba(255,120,40,${0.7 + intensity * 0.3})`;
  ctx.shadowBlur = 14 + intensity * 14;
  ctx.strokeStyle = '#ffb23c';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#241008';

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(side * 46 - 7, -120, 14, 120, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(-64, -132, 128, 14, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-50, -110, 100, 9, 3);
  ctx.fill();
  ctx.stroke();

  // Flame silhouettes licking up from the lintel, taller and hotter the
  // closer this level is to the end of the group.
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,${140 - Math.floor(intensity * 40)},50,0.85)`;
  const flameCount = 5;
  for (let i = 0; i < flameCount; i++) {
    const fx = -60 + i * 30;
    const fh = (16 + hash(i * 7) * 14) * (0.6 + intensity * 0.6);
    ctx.beginPath();
    ctx.moveTo(fx - 6, -132);
    ctx.quadraticCurveTo(fx, -132 - fh, fx + 6, -132);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#150a06';
  ctx.fillRect(-8, -131, 16, 12);
  ctx.strokeRect(-8, -131, 16, 12);

  ctx.restore();
}

export function drawSpiritFlame(ctx: CanvasRenderingContext2D, x: number, y: number, glowPhase: number) {
  ctx.save();
  const wobbleX = Math.sin(glowPhase * 0.7) * 4;
  const wobbleY = Math.sin(glowPhase * 1.3) * 5;
  ctx.translate(x + wobbleX, y + wobbleY);
  const glow = 0.5 + Math.sin(glowPhase) * 0.2;

  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  halo.addColorStop(0, `rgba(120,220,180,${glow * 0.6})`);
  halo.addColorStop(1, 'rgba(120,220,180,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-26, -26, 52, 52);

  ctx.fillStyle = `rgba(150,255,210,${0.7 + glow * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(6, -4, 4, 4);
  ctx.quadraticCurveTo(0, 9, -4, 4);
  ctx.quadraticCurveTo(-6, -4, 0, -12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
