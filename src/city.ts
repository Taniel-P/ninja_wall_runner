// Tokyo city theme, drawn entirely procedurally (same approach as forest.ts's
// sky/mountains/mist/torii/lanterns) - no external art assets, so there's no
// licensing surface at all and full control over the busy-neon-night mood.

type Platform = { x: number; y: number; w: number; h: number };

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// --- Night sky + light-pollution glow --------------------------------------

// Static for a given canvas size, so bake once and blit - same reasoning as
// forest's drawSky.
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
    sky.addColorStop(0, '#0a0a1a');
    sky.addColorStop(0.5, '#151230');
    sky.addColorStop(0.8, '#2a1840');
    sky.addColorStop(1, '#3d1f3a');
    sctx.fillStyle = sky;
    sctx.fillRect(0, 0, width, height);

    // Light-pollution glow low on the horizon, warm against the cool sky.
    const glow = sctx.createLinearGradient(0, height * 0.7, 0, height);
    glow.addColorStop(0, 'rgba(255,110,150,0)');
    glow.addColorStop(1, 'rgba(255,140,120,0.28)');
    sctx.fillStyle = glow;
    sctx.fillRect(0, height * 0.7, width, height * 0.3);

    // Scattered dim stars, upper sky only (city glow washes out the rest).
    for (let i = 0; i < 40; i++) {
      const sx = hash(i * 3.1) * width;
      const sy = hash(i * 7.7) * height * 0.45;
      const b = 0.2 + hash(i * 13.3) * 0.4;
      sctx.fillStyle = `rgba(255,255,255,${b})`;
      sctx.fillRect(sx, sy, 1.5, 1.5);
    }

    skyCache = canvas;
    skyCacheKey = key;
  }
  ctx.drawImage(skyCache, 0, 0);
}

// --- Parallax skyscraper skyline -------------------------------------------

// Two layers of blocky silhouettes with lit windows, regenerated only when
// their parallax offset has actually moved enough to matter - same
// regen-threshold trick as forest's drawMountains, since re-tracing dozens of
// window rects every frame bought nothing visible.
type SkylineLayerCache = { canvas: HTMLCanvasElement; offset: number };
const skylineCache = new Map<number, SkylineLayerCache>();
// See MOUNTAIN_REGEN_THRESHOLD in forest.ts for why this was raised from 1.5.
const SKYLINE_REGEN_THRESHOLD = 15;

export function drawSkyline(ctx: CanvasRenderingContext2D, width: number, height: number, cameraY: number) {
  const layers = [
    { color: '#140f28', winColor: 'rgba(255,210,140,0.18)', speed: 0.03, base: 0.62, buildingW: 70, jitter: 0.35 },
    { color: '#1d1638', winColor: 'rgba(140,220,255,0.28)', speed: 0.07, base: 0.72, buildingW: 55, jitter: 0.5 },
  ];
  layers.forEach((layer, index) => {
    const offset = cameraY * layer.speed;
    let cached = skylineCache.get(index);
    const sizeChanged = cached && (cached.canvas.width !== width || cached.canvas.height !== height);
    if (!cached || sizeChanged || Math.abs(offset - cached.offset) > SKYLINE_REGEN_THRESHOLD) {
      const canvas = cached && !sizeChanged ? cached.canvas : document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const lctx = canvas.getContext('2d')!;
      lctx.clearRect(0, 0, width, height);

      const count = Math.ceil(width / layer.buildingW) + 2;
      for (let i = 0; i < count; i++) {
        const bx = i * layer.buildingW - (offset % layer.buildingW);
        const seed = i * 31 + index * 977;
        const h = height * layer.base - hash(seed) * height * layer.jitter * layer.base;
        const bw = layer.buildingW - 6;
        const by = height - h;
        lctx.fillStyle = layer.color;
        lctx.fillRect(bx, by, bw, h + 4);

        // Lit windows in a loose grid, randomly on/off per building.
        const winSize = 4;
        const winGapX = 10;
        const winGapY = 14;
        for (let wy = by + 10; wy < height - 8; wy += winGapY) {
          for (let wx = bx + 6; wx < bx + bw - 6; wx += winGapX) {
            if (hash(seed + wx * 0.7 + wy * 1.3) > 0.55) {
              lctx.fillStyle = layer.winColor;
              lctx.fillRect(wx, wy, winSize, winSize);
            }
          }
        }
      }
      cached = { canvas, offset };
      skylineCache.set(index, cached);
    }
    ctx.drawImage(cached.canvas, 0, 0);
  });
}

// --- Haze (screen-space parallax bands, neon-tinted) ------------------------

// Same rigid-pair-baked-to-a-tile trick as forest's drawMist.
type HazeBandCache = { canvas: HTMLCanvasElement; originX: number; originY: number };
const hazeCache = new Map<number, HazeBandCache>();

export function drawHaze(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const bands = [
    { y: 0.58, speed: 7, alpha: 0.10, color: '255,120,200' },
    { y: 0.83, speed: -10, alpha: 0.12, color: '120,220,255' },
  ];
  bands.forEach((band, index) => {
    let cached = hazeCache.get(index);
    if (!cached || cached.canvas.width !== Math.ceil(width * 1.95)) {
      const originX = width * 0.9;
      const originY = 30;
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * 1.95);
      canvas.height = 70;
      const hctx = canvas.getContext('2d')!;
      hctx.fillStyle = `rgba(${band.color},${band.alpha})`;
      hctx.beginPath();
      hctx.ellipse(originX - width * 0.2, originY, width * 0.7, 26, 0, 0, Math.PI * 2);
      hctx.ellipse(originX + width * 0.55, originY + 10, width * 0.5, 20, 0, 0, Math.PI * 2);
      hctx.fill();
      cached = { canvas, originX, originY };
      hazeCache.set(index, cached);
    }
    const scrollX = (time * band.speed) % width;
    ctx.drawImage(cached.canvas, scrollX - cached.originX, height * band.y - cached.originY);
  });
}

// --- Background alley clutter (world-space, slow parallax) -----------------

// A row of low background buildings + power lines flanking the shaft, well
// behind the platforms. Cached per-row the same way the bamboo grove's plant
// art was reused, except here it's baked procedurally instead of loaded from
// a file, and only visible rows are drawn.
let clutterTile: HTMLCanvasElement | null = null;

function ensureClutterTile(): HTMLCanvasElement {
  if (clutterTile) return clutterTile;
  const w = 90;
  const h = 170;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const cctx = canvas.getContext('2d')!;

  cctx.fillStyle = '#1a1530';
  cctx.fillRect(10, 20, w - 20, h - 20);
  cctx.strokeStyle = 'rgba(0,0,0,0.4)';
  cctx.lineWidth = 2;
  cctx.strokeRect(10, 20, w - 20, h - 20);

  for (let wy = 30; wy < h - 10; wy += 18) {
    for (let wx = 18; wx < w - 18; wx += 16) {
      if (hash(wx * 3.3 + wy * 1.1) > 0.5) {
        cctx.fillStyle = 'rgba(255,200,130,0.35)';
        cctx.fillRect(wx, wy, 6, 8);
      }
    }
  }

  // Power line drooping across the top.
  cctx.strokeStyle = 'rgba(10,8,20,0.6)';
  cctx.lineWidth = 1.5;
  cctx.beginPath();
  cctx.moveTo(0, 10);
  cctx.quadraticCurveTo(w / 2, 26, w, 8);
  cctx.stroke();

  clutterTile = canvas;
  return clutterTile;
}

export function drawAlleyClutter(ctx: CanvasRenderingContext2D, level: { width: number }, cameraY: number, viewportHeight: number) {
  const tile = ensureClutterTile();
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

// --- Platforms: procedural rooftop-ledge texture, baked and cached per
// platform the same way forest.ts bakes the bamboo-stalk texture - the level
// geometry is static so there's no reason to re-draw pipes/rivets every frame.

const platformTextureCache = new WeakMap<Platform, HTMLCanvasElement>();

function renderPlatformTexture(platform: Platform): HTMLCanvasElement {
  const { x, w, h } = platform;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d')!;

  // Concrete base with a soft vertical gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5a5a68');
  grad.addColorStop(1, '#38384a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Panel seams.
  const seamSpacing = 30;
  ctx.strokeStyle = 'rgba(15,15,25,0.4)';
  ctx.lineWidth = 1.5;
  for (let sx = seamSpacing; sx < w; sx += seamSpacing) {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }

  // Scattered rooftop clutter: pipes, vents, rivets.
  const propCount = Math.max(1, Math.floor(w / 45));
  for (let i = 0; i < propCount; i++) {
    const seed = Math.floor(x) * 7 + i;
    const px = 10 + hash(seed) * Math.max(1, w - 30);
    const kind = hash(seed + 50);
    if (kind > 0.5) {
      // Vent pipe.
      ctx.fillStyle = '#26263a';
      ctx.beginPath();
      ctx.roundRect(px, 4, 12, Math.min(16, h - 8), 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Rivet cluster.
      ctx.fillStyle = 'rgba(200,200,220,0.25)';
      ctx.beginPath();
      ctx.arc(px, 6, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Hazard stripe along the top edge (safety yellow, alternating with black).
  const stripeW = 12;
  const stripeH = 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, stripeH);
  ctx.clip();
  for (let sx = 0; sx * stripeW < w + h; sx++) {
    ctx.fillStyle = sx % 2 === 0 ? '#e0c020' : '#1a1a1a';
    ctx.save();
    ctx.translate(sx * stripeW - h, 0);
    ctx.transform(1, 0, -0.6, 1, 0, 0);
    ctx.fillRect(0, -2, stripeW, stripeH + 4);
    ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(10,10,18,0.6)';
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

// --- Shrine gate (goal marker) + neon signs ---------------------------------

// A small neon-outlined torii, styled like it's tucked between buildings -
// keeps the "gate marks the goal" language from the forest group while
// reading as authentically Tokyo (real shrine gates do sit between
// skyscrapers there).
export function drawShrineGate(ctx: CanvasRenderingContext2D, cx: number, groundY: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(255,60,140,0.9)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#ff3c8c';
  ctx.lineWidth = 4;
  ctx.fillStyle = '#170a18';

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

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0d0612';
  ctx.fillRect(-8, -131, 16, 12);
  ctx.strokeRect(-8, -131, 16, 12);

  ctx.restore();
}

export function drawNeonSign(ctx: CanvasRenderingContext2D, x: number, y: number, glowPhase: number) {
  ctx.save();
  ctx.translate(x, y);
  const glow = 0.5 + Math.sin(glowPhase) * 0.2;
  const colors = ['255,60,140', '80,220,255'];
  const color = colors[Math.floor(x) % 2];

  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
  halo.addColorStop(0, `rgba(${color},${glow})`);
  halo.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(-28, -28, 56, 56);

  ctx.fillStyle = '#0d0612';
  ctx.strokeStyle = `rgba(${color},${0.8 + glow * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-9, -22, 18, 26, 3);
  ctx.fill();
  ctx.stroke();

  // Two glowing bars standing in for signage text.
  ctx.strokeStyle = `rgba(${color},${0.9})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-5, -16);
  ctx.lineTo(-5, -4);
  ctx.moveTo(5, -16);
  ctx.lineTo(5, -4);
  ctx.stroke();

  ctx.restore();
}
