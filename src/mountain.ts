// Mt. Fuji theme: a treacherous storm-lashed climb toward something
// ominous waiting at the summit, foreshadowing the temple group's final
// boss. Drawn entirely procedurally, same approach as forest.ts/city.ts -
// no external art assets, so there's no licensing surface and full control
// over the "climbing into danger" mood.

type Platform = { x: number; y: number; w: number; h: number };

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// --- Storm sky + summit glow + lightning ------------------------------------

// Static for a given canvas size, so bake once and blit - same reasoning as
// forest/city's drawSky. The lightning flicker is applied as a cheap flat
// alpha overlay on top of the cached bitmap, not baked into it, so it can
// still animate without re-rasterizing the gradient/stars every frame.
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
    sky.addColorStop(0, '#0c0e18');
    sky.addColorStop(0.4, '#1c2035');
    sky.addColorStop(0.75, '#332c42');
    sky.addColorStop(1, '#4a2a2a');
    sctx.fillStyle = sky;
    sctx.fillRect(0, 0, width, height);

    // An ominous warm glow low on the horizon - something waiting up there.
    const glow = sctx.createLinearGradient(0, height * 0.72, 0, height);
    glow.addColorStop(0, 'rgba(255,90,50,0)');
    glow.addColorStop(1, 'rgba(255,110,40,0.22)');
    sctx.fillStyle = glow;
    sctx.fillRect(0, height * 0.72, width, height * 0.28);

    // Thin high-altitude stars, sparser and dimmer than the city's - the
    // storm clouds below wash most of the sky out.
    for (let i = 0; i < 24; i++) {
      const sx = hash(i * 4.1) * width;
      const sy = hash(i * 8.3) * height * 0.3;
      const b = 0.15 + hash(i * 17.7) * 0.3;
      sctx.fillStyle = `rgba(220,225,255,${b})`;
      sctx.fillRect(sx, sy, 1.5, 1.5);
    }

    skyCache = canvas;
    skyCacheKey = key;
  }
  ctx.drawImage(skyCache, 0, 0);

  // Lightning: a rare, brief flat flash - just an alpha pulse over the
  // cached sky, no new geometry, so it's essentially free.
  const cycle = time % 6.5;
  if (cycle < 0.12) {
    const flash = (Math.sin((cycle / 0.12) * Math.PI)) * 0.22;
    ctx.fillStyle = `rgba(210,220,255,${flash})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// --- Parallax jagged snow peaks ---------------------------------------------

// Two layers of sharp, snow-capped silhouettes, regenerated only when their
// parallax offset has moved enough to matter - same regen-threshold trick as
// forest's drawMountains / city's drawSkyline.
type PeakLayerCache = { canvas: HTMLCanvasElement; offset: number };
const peakCache = new Map<number, PeakLayerCache>();
const PEAK_REGEN_THRESHOLD = 1.5;

export function drawPeaks(ctx: CanvasRenderingContext2D, width: number, height: number, cameraY: number) {
  const layers = [
    { rock: '#241f2e', snow: '#3a3448', speed: 0.02, amp: 60, base: 0.5 },
    { rock: '#312a3d', snow: '#4a4258', speed: 0.05, amp: 80, base: 0.62 },
  ];
  layers.forEach((layer, index) => {
    const offset = cameraY * layer.speed;
    let cached = peakCache.get(index);
    const sizeChanged = cached && (cached.canvas.width !== width || cached.canvas.height !== height);
    if (!cached || sizeChanged || Math.abs(offset - cached.offset) > PEAK_REGEN_THRESHOLD) {
      const canvas = cached && !sizeChanged ? cached.canvas : document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const lctx = canvas.getContext('2d')!;
      lctx.clearRect(0, 0, width, height);

      const step = width / 8;
      const ridge: Array<[number, number]> = [];
      for (let i = 0; i <= 8; i++) {
        const x = i * step;
        const jag = (hash(i * 9.1 + index * 41) - 0.5) * layer.amp * 0.6;
        const peak = height * layer.base - Math.abs(Math.sin(i * 2.3 + offset * 0.01)) * layer.amp + jag;
        ridge.push([x, peak]);
      }

      lctx.fillStyle = layer.rock;
      lctx.beginPath();
      lctx.moveTo(0, height);
      for (const [x, y] of ridge) lctx.lineTo(x, y);
      lctx.lineTo(width, height);
      lctx.closePath();
      lctx.fill();

      // Snow caps: a thin lighter sliver just below each ridge peak.
      lctx.fillStyle = layer.snow;
      lctx.beginPath();
      lctx.moveTo(ridge[0][0], ridge[0][1] + 14);
      for (const [x, y] of ridge) lctx.lineTo(x, y);
      for (let i = ridge.length - 1; i >= 0; i--) {
        lctx.lineTo(ridge[i][0], ridge[i][1] + 16);
      }
      lctx.closePath();
      lctx.fill();

      cached = { canvas, offset };
      peakCache.set(index, cached);
    }
    ctx.drawImage(cached.canvas, 0, 0);
  });
}

// --- Storm clouds (screen-space parallax bands) -----------------------------

// Same rigid-pair-baked-to-a-tile trick as forest's drawMist / city's
// drawHaze, just in a colder, stormier palette.
type CloudBandCache = { canvas: HTMLCanvasElement; originX: number; originY: number };
const cloudCache = new Map<number, CloudBandCache>();

export function drawStormClouds(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const bands = [
    { y: 0.5, speed: 5, alpha: 0.16, color: '60,60,80' },
    { y: 0.78, speed: -8, alpha: 0.2, color: '40,40,60' },
  ];
  bands.forEach((band, index) => {
    let cached = cloudCache.get(index);
    if (!cached || cached.canvas.width !== Math.ceil(width * 1.95)) {
      const originX = width * 0.9;
      const originY = 34;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 1.95);
      canvas.height = 80;
      const cctx = canvas.getContext('2d')!;
      cctx.fillStyle = `rgba(${band.color},${band.alpha})`;
      cctx.beginPath();
      cctx.ellipse(originX - width * 0.2, originY, width * 0.75, 30, 0, 0, Math.PI * 2);
      cctx.ellipse(originX + width * 0.55, originY + 12, width * 0.55, 24, 0, 0, Math.PI * 2);
      cctx.fill();
      cached = { canvas, originX, originY };
      cloudCache.set(index, cached);
    }
    const scrollX = (time * band.speed) % width;
    ctx.drawImage(cached.canvas, scrollX - cached.originX, height * band.y - cached.originY);
  });
}

// --- Background cliffside clutter (world-space, slow parallax) -------------

// Wind-bent dead pines and jagged rock outcrops flanking the shaft, cached
// into a single tile and only visible rows drawn - same pattern as the
// bamboo grove / alley clutter.
let cliffTile: HTMLCanvasElement | null = null;

function ensureCliffTile(): HTMLCanvasElement {
  if (cliffTile) return cliffTile;
  const w = 90;
  const h = 170;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const cctx = canvas.getContext('2d')!;

  // Rock outcrop.
  cctx.fillStyle = '#2a2534';
  cctx.beginPath();
  cctx.moveTo(0, h);
  cctx.lineTo(10, h - 60);
  cctx.lineTo(30, h - 40);
  cctx.lineTo(45, h - 90);
  cctx.lineTo(60, h - 45);
  cctx.lineTo(80, h - 70);
  cctx.lineTo(w, h);
  cctx.closePath();
  cctx.fill();

  // A wind-bent dead pine.
  cctx.strokeStyle = '#1a1620';
  cctx.lineWidth = 3;
  cctx.beginPath();
  cctx.moveTo(20, h - 55);
  cctx.quadraticCurveTo(28, h - 90, 45, h - 100);
  cctx.stroke();
  for (const t of [0.35, 0.55, 0.75]) {
    const bx = 20 + (45 - 20) * t;
    const by = (h - 55) + ((h - 100) - (h - 55)) * t;
    cctx.beginPath();
    cctx.moveTo(bx, by);
    cctx.lineTo(bx + 10, by - 6);
    cctx.stroke();
  }

  cliffTile = canvas;
  return cliffTile;
}

export function drawCliffside(ctx: CanvasRenderingContext2D, level: { width: number }, cameraY: number, viewportHeight: number) {
  const tile = ensureCliffTile();
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

// --- Platforms: procedural icy-rock ledge texture, baked and cached per
// platform the same way forest/city bake theirs - the level geometry is
// static so there's no reason to re-draw cracks/frost every frame.

const platformTextureCache = new WeakMap<Platform, HTMLCanvasElement>();

function renderPlatformTexture(platform: Platform): HTMLCanvasElement {
  const { x, w, h } = platform;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;

  // Cold slate-rock base.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5c5866');
  grad.addColorStop(1, '#38343f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Jagged cracks.
  const crackCount = Math.max(1, Math.floor(w / 40));
  ctx.strokeStyle = 'rgba(15,12,20,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < crackCount; i++) {
    const seed = Math.floor(x) * 11 + i;
    let cx = 8 + hash(seed) * Math.max(1, w - 16);
    let cy = h * 0.3 + hash(seed + 5) * h * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) {
      cx += (hash(seed + s * 3) - 0.5) * 14;
      cy += hash(seed + s * 7) * 8;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Frost/ice highlights.
  const propCount = Math.max(1, Math.floor(w / 45));
  for (let i = 0; i < propCount; i++) {
    const seed = Math.floor(x) * 13 + i + 500;
    const px = 10 + hash(seed) * Math.max(1, w - 30);
    const py = 8 + hash(seed + 3) * Math.max(1, h - 16);
    ctx.fillStyle = 'rgba(210,225,245,0.2)';
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snow cap along the top edge (same jagged-tuft technique as forest's
  // moss cap, in white instead of green).
  ctx.fillStyle = '#e4ecf7';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const tuftStep = 10;
  for (let tx = 0; tx <= w; tx += tuftStep) {
    const tuft = 3 + hash(Math.floor(x) + tx) * 4;
    ctx.lineTo(tx, tuft);
  }
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(8,6,12,0.6)';
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

// --- Storm gate (goal marker) + prayer lanterns -----------------------------

// A weathered stone torii crackling with ominous energy - same silhouette
// language as the forest/city gates, but foreboding instead of warm or
// festive, foreshadowing what's waiting in the temple group.
export function drawStormGate(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(255,80,50,0.85)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#7a3a2a';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#2a2028';

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

  // Jagged energy crackling along the lintel instead of a smooth halo.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,140,60,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-60, -125);
  ctx.lineTo(-40, -136);
  ctx.lineTo(-20, -122);
  ctx.lineTo(0, -134);
  ctx.lineTo(20, -122);
  ctx.lineTo(40, -136);
  ctx.lineTo(60, -125);
  ctx.stroke();

  ctx.fillStyle = '#150c0e';
  ctx.fillRect(-8, -131, 16, 12);
  ctx.strokeRect(-8, -131, 16, 12);

  ctx.restore();
}

export function drawPrayerLantern(ctx: CanvasRenderingContext2D, x: number, y: number, glowPhase: number) {
  ctx.save();
  ctx.translate(x, y);
  const glow = 0.5 + Math.sin(glowPhase) * 0.15;

  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
  halo.addColorStop(0, `rgba(150,200,255,${glow * 0.7})`);
  halo.addColorStop(1, 'rgba(150,200,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-24, -24, 48, 48);

  // Stone lantern body.
  ctx.fillStyle = '#4a4652';
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 16, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,8,14,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillRect(-10, -2, 20, 4);
  ctx.fillRect(-6, 2, 12, 6);

  // A cold blue-white flame within.
  ctx.fillStyle = `rgba(170,215,255,${0.6 + glow * 0.3})`;
  ctx.beginPath();
  ctx.arc(0, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  // A tattered prayer flag fluttering beside it.
  ctx.fillStyle = 'rgba(200,60,60,0.55)';
  ctx.beginPath();
  ctx.moveTo(10, -18);
  ctx.lineTo(24, -16 + Math.sin(glowPhase * 1.3) * 3);
  ctx.lineTo(24, -10 + Math.sin(glowPhase * 1.3) * 3);
  ctx.lineTo(10, -12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
