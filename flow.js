// Home page hero: a Lorenz attractor and Tinkerbell map dust, projected from
// 3D by hand and drawn on a p5 canvas, with packets of light moving along the
// lines. The numbers near the top of each section are the ones worth tuning.

const INK = "230,227,220";
const PHONE_STRETCH = 2.1; // how much taller the drawing is on phones
const YAW_SWING = 0.58;
const PITCH_CENTER = 0.12;
const PITCH_SWING = 0.07;
const FEED_SPACING = 2; // pixels between points on the lines to the offerings
const FEED_SPAN = 26; // half the length of a packet on those lines, in points
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

let hero, offeringRow, offeringButtons, W, H, N, D, ctx, sprite;
let wx, wy, wz, sx, sy, sz; // Lorenz line: world and screen positions
let dx, dy, dz; // Tinkerbell dust: world positions
let packets = [];
let feeders = [];
let active = 0; // the first offering starts selected
let yaw = 0;
let pitch = 0.12;
let px, py, pz, cx, cy, S, Sx, bounds;
let shiftX = 0;
let shiftY = 0;

function heroHeight() {
  return Math.ceil(offeringRow.getBoundingClientRect().bottom - hero.getBoundingClientRect().top);
}

function setup() {
  hero = document.getElementById("hero");
  offeringRow = document.querySelector(".offering-row");
  offeringButtons = [...document.querySelectorAll(".offering")];

  const small = innerWidth < 700;
  N = small ? 1700 : 3400;
  D = small ? 1500 : 4200;
  pixelDensity(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  createCanvas(hero.offsetWidth, heroHeight()).parent(hero);
  ctx = drawingContext;

  buildLorenz();
  buildDust();
  buildSprite();
  bounds = measureBounds();
  layout();

  for (let i = 0; i < (small ? 4 : 8); i++) {
    packets.push({ p: Math.random() * N, v: (i % 2 ? -1 : 1) * (1.1 + Math.random() * 1.5) });
  }

  offeringButtons.forEach((button, i) => {
    feeders[i].packets = [
      { t: Math.random(), v: 0.0011 },
      { t: Math.random(), v: -0.0008 },
    ];
    button.addEventListener("mouseenter", () => activate(i));
    button.addEventListener("click", () => activate(i));
  });

  if (reduced) {
    noLoop();
  } else {
    // Stop drawing while the hero is scrolled out of view.
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loop();
      else noLoop();
    }).observe(hero.querySelector("canvas"));
  }

  document.fonts.ready.then(windowResized);
}

function activate(i) {
  if (active !== i && !reduced) {
    for (let k = 0; k < 4; k++) feeders[i].packets.push({ t: -k * 0.2, v: 0.0034, burst: true });
  }
  active = i;
  if (reduced) redraw();
}

// Lorenz system, integrated once at load. The first two multipliers on the
// last line set its width and height; the sign on z turns it upside down.
function buildLorenz() {
  wx = new Float32Array(N);
  wy = new Float32Array(N);
  wz = new Float32Array(N);
  sx = new Float32Array(N);
  sy = new Float32Array(N);
  sz = new Float32Array(N);

  let x = 0.1;
  let y = 0;
  let z = 0;
  const h = 0.0058;
  const s = 10;
  const r = 28;
  const b = 8 / 3;
  const fx = (x, y) => s * (y - x);
  const fy = (x, y, z) => x * (r - z) - y;
  const fz = (x, y, z) => x * y - b * z;

  function step() {
    const k1x = fx(x, y), k1y = fy(x, y, z), k1z = fz(x, y, z);
    const x2 = x + (h / 2) * k1x, y2 = y + (h / 2) * k1y, z2 = z + (h / 2) * k1z;
    const k2x = fx(x2, y2), k2y = fy(x2, y2, z2), k2z = fz(x2, y2, z2);
    const x3 = x + (h / 2) * k2x, y3 = y + (h / 2) * k2y, z3 = z + (h / 2) * k2z;
    const k3x = fx(x3, y3), k3y = fy(x3, y3, z3), k3z = fz(x3, y3, z3);
    const x4 = x + h * k3x, y4 = y + h * k3y, z4 = z + h * k3z;
    const k4x = fx(x4, y4), k4y = fy(x4, y4, z4), k4z = fz(x4, y4, z4);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    z += (h / 6) * (k1z + 2 * k2z + 2 * k3z + k4z);
  }

  for (let i = 0; i < 1500; i++) step();
  for (let i = 0; i < N; i++) {
    step();
    wx[i] = x * 2.5;
    wy[i] = (z - 25) * 1.08;
    wz[i] = y * 0.9;
  }
}

// Tinkerbell map: a 2D chaotic point cloud, lifted into 3D as dust.
function buildDust() {
  dx = new Float32Array(D);
  dy = new Float32Array(D);
  dz = new Float32Array(D);
  let x = -0.72;
  let y = -0.64;
  for (let i = 0; i < D; i++) {
    const nx = x * x - y * y + 0.9 * x - 0.6013 * y;
    const ny = 2 * x * y + 2 * x + 0.5 * y;
    x = nx;
    y = ny;
    dx[i] = (x + 0.4) * 58;
    dy[i] = -(y + 0.5) * 30;
    dz[i] = x * y * 26 - 6;
  }
}

function buildSprite() {
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const c = sprite.getContext("2d");
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${INK},1)`);
  g.addColorStop(0.18, `rgba(${INK},.55)`);
  g.addColorStop(1, `rgba(${INK},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
}

// How far the drawing can reach from its center, at scale 1, across its swing.
function measureBounds() {
  cx = 0;
  cy = 0;
  S = 1;
  Sx = 1;
  shiftX = 0;
  shiftY = 0;
  let left = 0;
  let right = 0;
  let up = 0;
  let down = 0;
  function include() {
    left = Math.max(left, -px);
    right = Math.max(right, px);
    up = Math.max(up, -py);
    down = Math.max(down, py);
  }
  for (let a = -8; a <= 8; a++) {
    for (let b = -2; b <= 2; b++) {
      yaw = (a / 8) * YAW_SWING;
      pitch = PITCH_CENTER + (b / 2) * PITCH_SWING;
      for (let i = 0; i < N; i += 4) {
        project(wx[i], wy[i], wz[i]);
        include();
      }
      for (let i = 0; i < D; i += 2) {
        project(dx[i], dy[i], dz[i]);
        include();
      }
    }
  }
  // These nudges put the middle of the drawing's full extent on the center point.
  shiftX = (left - right) / 2;
  shiftY = (up - down) / 2;
  return { halfWidth: (left + right) / 2, halfHeight: (up + down) / 2 };
}

// Centers the form on the headline and aims a line from there to each offering.
function layout() {
  W = width;
  H = height;
  const heroBox = hero.getBoundingClientRect();
  const headline = document.querySelector(".mission h1").getBoundingClientRect();
  cx = W / 2;
  cy = headline.top - heroBox.top + headline.height / 2;
  // Overall size. Every limit below keeps the whole drawing, at every point
  // in its swing, inside the margins: the sides line up with the offerings.
  const sideMargin = offeringButtons[0].getBoundingClientRect().left - heroBox.left;
  const edgeMargin = Math.max(16, Math.min(W, H) * 0.04);
  // The extra 10 leaves room for the glow around a packet at the far edge.
  const fitSides = (cx - sideMargin - 10) / bounds.halfWidth;
  const barHeight = document.querySelector(".site-bar").offsetHeight;
  const fitTop = (cy - barHeight - 8) / bounds.halfHeight; // stays clear of the top bar
  const fitBottom = (H - cy - edgeMargin) / bounds.halfHeight;
  S = Math.min(H / 66, fitTop, fitBottom, fitSides);
  Sx = Math.min(S * 1.45, fitSides, W < 700 ? fitSides : W / 122);
  S = Math.min(S, Sx);
  // Phones: stretch the drawing taller so it shows around the headline.
  if (W < 700) {
    const boxesBottom = offeringButtons[0].getBoundingClientRect().bottom - heroBox.top;
    S = Math.min(Sx * PHONE_STRETCH, fitTop, (boxesBottom - cy) / bounds.halfHeight);
  }

  offeringButtons.forEach((button, i) => {
    const box = button.getBoundingClientRect();
    const packets = feeders[i] ? feeders[i].packets : [];
    feeders[i] = buildFeeder(box.left - heroBox.left + box.width / 2, box.top - heroBox.top);
    feeders[i].packets = packets;
  });
}

// A curve from the center to an offering, resampled so its points are evenly
// spaced and packets travel at a steady speed.
function buildFeeder(ex, ey) {
  const c1y = cy + (ey - cy) * 0.55;
  const c2y = ey - (ey - cy) * 0.5;
  const fine = 500;
  const fx = new Float32Array(fine + 1);
  const fy = new Float32Array(fine + 1);
  const along = new Float32Array(fine + 1);
  for (let k = 0; k <= fine; k++) {
    const u = k / fine;
    const v = 1 - u;
    fx[k] = v * v * v * cx + 3 * v * v * u * cx + 3 * v * u * u * ex + u * u * u * ex;
    fy[k] = v * v * v * cy + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * ey;
    if (k > 0) along[k] = along[k - 1] + Math.hypot(fx[k] - fx[k - 1], fy[k] - fy[k - 1]);
  }
  const n = Math.max(2, Math.ceil(along[fine] / FEED_SPACING) + 1);
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const target = (along[fine] * i) / (n - 1);
    while (k < fine - 1 && along[k + 1] < target) k++;
    const part = (target - along[k]) / (along[k + 1] - along[k] || 1);
    xs[i] = fx[k] + (fx[k + 1] - fx[k]) * part;
    ys[i] = fy[k] + (fy[k + 1] - fy[k]) * part;
  }
  return { xs, ys, n };
}

function windowResized() {
  const nextHeight = heroHeight();
  if (hero.offsetWidth !== width || nextHeight !== height) {
    resizeCanvas(hero.offsetWidth, nextHeight);
    ctx = drawingContext;
  }
  layout();
  if (reduced) redraw();
}

function project(x, y, z) {
  const ca = Math.cos(yaw);
  const sa = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = x * ca + z * sa;
  const z1 = -x * sa + z * ca;
  const y1 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const f = 190 / (190 + z2);
  px = cx + (x1 * f + shiftX) * Sx;
  py = cy + (y1 * f + shiftY) * S;
  pz = z2;
}

// Draws one packet as a single tapered ribbon that follows the line. Its
// position is continuous rather than snapped to points on the path, and
// strength fades it in and out so it never pops at the ends of a line.
function pulse(xs, ys, n, pos, span, step, strength) {
  if (strength <= 0) return;
  const base = Math.floor(pos);
  const left = [];
  const right = [];
  for (let i = base - span; i <= base + span; i += step) {
    if (i < 1 || i >= n - 1) continue;
    let tx = xs[i + 1] - xs[i - 1];
    let ty = ys[i + 1] - ys[i - 1];
    const length = Math.hypot(tx, ty) || 1;
    tx /= length;
    ty /= length;
    const offset = (i - pos) / (span * 0.46);
    const half = 1.45 * Math.exp(-offset * offset) * strength;
    left.push(xs[i] - ty * half, ys[i] + tx * half);
    right.push(xs[i] + ty * half, ys[i] - tx * half);
  }
  if (left.length < 6) return;

  ctx.fillStyle = `rgba(${INK},${(0.75 * strength).toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(left[0], left[1]);
  for (let i = 2; i < left.length; i += 2) ctx.lineTo(left[i], left[i + 1]);
  for (let i = right.length - 2; i >= 0; i -= 2) ctx.lineTo(right[i], right[i + 1]);
  ctx.closePath();
  ctx.fill();

  if (base >= 0 && base < n - 1) {
    const fraction = pos - base;
    const hx = xs[base] + (xs[base + 1] - xs[base]) * fraction;
    const hy = ys[base] + (ys[base + 1] - ys[base]) * fraction;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4 * strength;
    ctx.drawImage(sprite, hx - 10, hy - 10, 20, 20);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

// Named to avoid p5's own global smooth().
function ease01(a, b, v) {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function draw() {
  const t = reduced ? 99 : millis() / 1000;
  const dt = Math.min(deltaTime / 16.67, 3);
  ctx.clearRect(0, 0, W, H);

  yaw = Math.sin(t * 0.13) * YAW_SWING;
  pitch = PITCH_CENTER + Math.sin(t * 0.09) * PITCH_SWING;

  for (let i = 0; i < N; i++) {
    project(wx[i], wy[i], wz[i]);
    sx[i] = px;
    sy[i] = py;
    sz[i] = pz;
  }

  // Dust
  const dustAlpha = ease01(2.2, 4.4, t);
  if (dustAlpha > 0) {
    ctx.fillStyle = `rgba(${INK},${(0.55 * dustAlpha).toFixed(3)})`;
    for (let i = 0; i < D; i++) {
      project(dx[i], dy[i], dz[i]);
      ctx.fillRect(px, py, 1.15, 1.15);
    }
  }

  // The line draws itself in; nearer parts are brighter.
  const revealed = Math.floor(N * (1 - Math.pow(1 - Math.min(1, t / 3.8), 3)));
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1;
  for (let i = 0; i < revealed - 1; i += 26) {
    const end = Math.min(i + 26, revealed - 1);
    const middle = (i + end) >> 1;
    const alpha = 0.78 - Math.max(0, Math.min(1, (sz[middle] + 36) / 72)) * 0.56;
    ctx.strokeStyle = `rgba(${INK},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(sx[i], sy[i]);
    for (let j = i + 1; j <= end; j++) ctx.lineTo(sx[j], sy[j]);
    ctx.stroke();
  }

  // Lines down to the offerings
  const feederAlpha = ease01(3, 4.4, t);
  if (feederAlpha > 0) {
    feeders.forEach((feeder, i) => {
      ctx.lineWidth = active === i ? 1.7 : 1;
      ctx.strokeStyle = `rgba(${INK},${((active === i ? 0.9 : 0.5) * feederAlpha).toFixed(3)})`;
      const last = Math.floor((feeder.n - 1) * feederAlpha);
      ctx.beginPath();
      ctx.moveTo(feeder.xs[0], feeder.ys[0]);
      for (let k = 1; k <= last; k++) ctx.lineTo(feeder.xs[k], feeder.ys[k]);
      ctx.stroke();
    });
  }

  // Packets
  if (t > 3.2 && !reduced) {
    packets.forEach((packet) => {
      packet.p += packet.v * dt * 0.42;
      if (packet.p < 40) packet.p = N - 41;
      if (packet.p > N - 41) packet.p = 40;
      pulse(sx, sy, N, packet.p, 30, 2, Math.min(1, (packet.p - 40) / 140, (N - 41 - packet.p) / 140));
    });
    feeders.forEach((feeder) => {
      feeder.packets = feeder.packets.filter((packet) => !(packet.burst && packet.t > 1.05));
      feeder.packets.forEach((packet) => {
        packet.t += packet.v * dt;
        if (!packet.burst) {
          if (packet.t > 1) packet.t = 0;
          if (packet.t < 0) packet.t = 1;
        }
        if (packet.t >= 0 && packet.t <= 1) {
          pulse(feeder.xs, feeder.ys, feeder.n, packet.t * (feeder.n - 1), FEED_SPAN, 1, Math.min(1, packet.t / 0.1, (1 - packet.t) / 0.1));
        }
      });
    });
  }
}
