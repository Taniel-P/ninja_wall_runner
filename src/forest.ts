import bambooPlantUrl from './assets/forest/bamboo-plant.png';

const bambooPlant = new Image();
bambooPlant.src = bambooPlantUrl;

type Platform = { x: number; y: number; w: number; h: number };

// --- Sky, moon, and distant mountains -------------------------------------

// The sky+moon are entirely static for a given canvas size (nothing about
// them depends on cameraY or time), so they were being redrawn - two
// gradients, three fills - every frame for no reason. Bake once per
// width/height and just blit the cached bitmap from then on.
let skyCache: HTMLCanvasElement | null = null;
let skyCacheKey = '';

export function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const key = `${width}x${height}`;
  if (!skyCache || skyCacheKey !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const sctx = canvas.getContext('2d')!;

    const sky = sctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#151033');
    sky.addColorStop(0.45, '#2a1f4d');
    sky.addColorStop(0.75, '#4a3163');
    sky.addColorStop(1, '#7a4a5c');
    sctx.fillStyle = sky;
    sctx.fillRect(0, 0, width, height);

    const moonX = width * 0.78;
    const moonY = height * 0.18;
    const glow = sctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 70);
    glow.addColorStop(0, 'rgba(255,246,214,0.55)');
    glow.addColorStop(1, 'rgba(255,246,214,0)');
    sctx.fillStyle = glow;
    sctx.fillRect(moonX - 80, moonY - 80, 160, 160);
    sctx.fillStyle = '#fff6d6';
    sctx.beginPath();
    sctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    sctx.fill();

    skyCache = canvas;
    skyCacheKey = key;
  }
  ctx.drawImage(skyCache, 0, 0);
}

// The mountain silhouettes only shift by a fraction of a pixel's worth of
// sine-phase per frame (amp/speed are both small), so re-tracing the path
// and filling it 120 times a second bought nothing visible. Re-render each
// layer only when its phase has actually moved enough to matter.
type MountainLayerCache = { canvas: HTMLCanvasElement; offset: number };
const mountainCache = new Map<number, MountainLayerCache>();
// This gates regenerating the whole cached layer (a full canvas clear +
// path fill) purely to shift a sine-wave phase by offset*0.01 radians - a
// threshold of 1.5 means that's a ~0.015rad (imperceptible) shift, but
// regen was firing on nearly every frame during any camera movement,
// tanking real-device framerate. 15 still keeps the phase shift subtle
// (~0.15rad) while cutting regen frequency by ~10x.
const MOUNTAIN_REGEN_THRESHOLD = 15;

export function drawMountains(ctx: CanvasRenderingContext2D, width: number, height: number, cameraY: number) {
  const layers = [
    { color: '#241a3d', speed: 0.02, amp: 40, base: 0.55 },
    { color: '#2f2148', speed: 0.05, amp: 55, base: 0.68 },
  ];
  layers.forEach((layer, index) => {
    const offset = cameraY * layer.speed;
    let cached = mountainCache.get(index);
    const sizeChanged = cached && (cached.canvas.width !== width || cached.canvas.height !== height);
    if (!cached || sizeChanged || Math.abs(offset - cached.offset) > MOUNTAIN_REGEN_THRESHOLD) {
      const canvas = cached && !sizeChanged ? cached.canvas : document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const lctx = canvas.getContext('2d')!;
      lctx.clearRect(0, 0, width, height);
      lctx.fillStyle = layer.color;
      lctx.beginPath();
      lctx.moveTo(0, height);
      const step = width / 6;
      for (let i = 0; i <= 6; i++) {
        const x = i * step;
        const peak = height * layer.base - Math.sin(i * 1.7 + offset * 0.01) * layer.amp;
        lctx.lineTo(x, peak);
      }
      lctx.lineTo(width, height);
      lctx.closePath();
      lctx.fill();
      cached = { canvas, offset };
      mountainCache.set(index, cached);
    }
    ctx.drawImage(cached.canvas, 0, 0);
  });
}

// --- Mist (screen-space parallax bands) ------------------------------------

// Each band is two soft translucent ellipses that only ever translate
// horizontally as a rigid pair, so the pair is baked once into a single
// tile (wide enough to hold both ellipses in full) and the tile is just
// repositioned with drawImage instead of re-rasterizing two ellipses
// every frame. Matches the original's plain modulo wrap (a "pop" back to
// start, not a seamless loop) rather than pretending it tiles infinitely.
type MistBandCache = { canvas: HTMLCanvasElement; originX: number; originY: number };
const mistCache = new Map<number, MistBandCache>();

export function drawMist(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const bands = [
    { y: 0.62, speed: 6, alpha: 0.14 },
    { y: 0.8, speed: -9, alpha: 0.18 },
  ];
  bands.forEach((band, index) => {
    let cached = mistCache.get(index);
    if (!cached || cached.canvas.width !== Math.ceil(width * 1.95)) {
      // Bounding box covering both ellipses (centers at -0.2w/+0.55w,
      // radii 0.7w/0.5w) relative to the shared scroll anchor.
      const originX = width * 0.9;
      const originY = 30;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 1.95);
      canvas.height = 70;
      const mctx = canvas.getContext('2d')!;
      mctx.fillStyle = `rgba(230,225,255,${band.alpha})`;
      mctx.beginPath();
      mctx.ellipse(originX - width * 0.2, originY, width * 0.7, 26, 0, 0, Math.PI * 2);
      mctx.ellipse(originX + width * 0.55, originY + 10, width * 0.5, 20, 0, 0, Math.PI * 2);
      mctx.fill();
      cached = { canvas, originX, originY };
      mistCache.set(index, cached);
    }
    const scrollX = (time * band.speed) % width;
    ctx.drawImage(cached.canvas, scrollX - cached.originX, height * band.y - cached.originY);
  });
}

// --- Background bamboo grove (world-space, slow parallax) ------------------

// A pre-flipped copy of the plant art, baked once, so alternating rows don't
// need a per-draw save/translate/scale/restore just to mirror the image.
let bambooPlantFlipped: HTMLCanvasElement | null = null;

function ensureFlippedBamboo(): HTMLCanvasElement | null {
  if (bambooPlantFlipped) return bambooPlantFlipped;
  if (!bambooPlant.complete || bambooPlant.naturalWidth === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = bambooPlant.naturalWidth;
  canvas.height = bambooPlant.naturalHeight;
  const fctx = canvas.getContext('2d')!;
  fctx.translate(canvas.width, 0);
  fctx.scale(-1, 1);
  fctx.drawImage(bambooPlant, 0, 0);
  bambooPlantFlipped = canvas;
  return bambooPlantFlipped;
}

export function drawBambooGrove(ctx: CanvasRenderingContext2D, level: { width: number }, cameraY: number, viewportHeight: number) {
  if (!bambooPlant.complete || bambooPlant.naturalWidth === 0) return;
  const flipped = ensureFlippedBamboo();
  const parallax = 0.35;
  const scale = 0.9;
  const w = bambooPlant.naturalWidth * scale;
  const h = bambooPlant.naturalHeight * scale;
  const spacing = 150;

  // Only the rows whose parallax-scrolled position actually falls within
  // the visible viewport (plus one row of buffer) - not the whole level.
  const parallaxShift = cameraY * (1 - parallax);
  const firstRow = Math.floor((cameraY - parallaxShift) / spacing) - 1;
  const lastRow = Math.ceil((cameraY + viewportHeight - parallaxShift) / spacing) + 1;

  ctx.globalAlpha = 0.5;
  for (let r = firstRow; r <= lastRow; r++) {
    const y = r * spacing + parallaxShift;
    const image = (r % 2 === 0 && flipped) ? flipped : bambooPlant;
    for (const xBase of [30, level.width - 30]) {
      ctx.drawImage(image, xBase - w / 2, y - h, w, h);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Platforms: procedural bamboo-stalk texture matching the character's
// art style, baked to an offscreen canvas once per platform and cached -
// the level geometry is static, so there's no reason to re-fill/stroke/clip
// dozens of stalks and joint rings from scratch on every single frame.

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const platformTextureCache = new WeakMap<Platform, HTMLCanvasElement>();

function renderPlatformTexture(platform: Platform): HTMLCanvasElement {
  const { x, w, h } = platform;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;

  // Base wood-brown fill with a soft vertical gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#7a5a3a');
  grad.addColorStop(1, '#5a4028');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Vertical bamboo stalks across the platform width.
  const stalkWidth = 26;
  const count = Math.ceil(w / stalkWidth) + 1;
  for (let i = 0; i < count; i++) {
    const sx = i * stalkWidth;
    const seed = Math.floor(x) * 7 + i;
    const tone = hash(seed);
    ctx.fillStyle = tone > 0.5 ? '#8a9e4a' : '#7c9142';
    ctx.beginPath();
    ctx.roundRect(sx + 2, 0, stalkWidth - 4, h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,10,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Joint rings.
    const jointSpacing = 34;
    const jointOffset = (hash(seed + 99) * jointSpacing) | 0;
    for (let jy = jointOffset; jy < h; jy += jointSpacing) {
      ctx.strokeStyle = 'rgba(40,30,10,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 3, jy);
      ctx.lineTo(sx + stalkWidth - 3, jy);
      ctx.stroke();
    }
  }

  // Moss cap along the top edge.
  ctx.fillStyle = '#4f7a3d';
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

  ctx.strokeStyle = 'rgba(20,15,5,0.5)';
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

// --- Torii gate + lanterns ------------------------------------------------

export function drawToriiGate(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#a8332b';
  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 3;

  // Pillars.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(side * 46 - 7, -120, 14, 120, 4);
    ctx.fill();
    ctx.stroke();
  }
  // Lintel (top beam).
  ctx.beginPath();
  ctx.roundRect(-64, -132, 128, 14, 5);
  ctx.fill();
  ctx.stroke();
  // Second beam under lintel.
  ctx.beginPath();
  ctx.roundRect(-50, -110, 100, 9, 3);
  ctx.fill();
  ctx.stroke();
  // Center plaque.
  ctx.fillStyle = '#e8d4a0';
  ctx.fillRect(-8, -131, 16, 12);
  ctx.strokeRect(-8, -131, 16, 12);

  ctx.restore();
}

export function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, glowPhase: number) {
  ctx.save();
  ctx.translate(x, y);
  const glow = 0.5 + Math.sin(glowPhase) * 0.15;
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  halo.addColorStop(0, `rgba(255,190,110,${glow})`);
  halo.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-26, -26, 52, 52);

  ctx.strokeStyle = '#2a1810';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, -12);
  ctx.stroke();

  ctx.fillStyle = '#c94f3a';
  ctx.beginPath();
  ctx.roundRect(-8, -12, 16, 18, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a2418';
  ctx.fillRect(-9, -13, 18, 3);
  ctx.fillRect(-9, 6, 18, 3);
  ctx.restore();
}
