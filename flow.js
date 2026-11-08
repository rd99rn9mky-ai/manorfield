// Home page hero: a Lorenz attractor and Tinkerbell map dust, projected from
// 3D by hand and drawn on a p5 canvas, with packets of light moving along the
// lines. The numbers near the top of each section are the ones worth tuning.

const INK = "230,227,220";
const FEED_N = 60;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

let hero, offeringRow, offeringButtons, W, H, N, D, ctx, sprite;
let wx, wy, wz, sx, sy, sz; // Lorenz line: world and screen positions
let dx, dy, dz; // Tinkerbell dust: world positions
let packets = [];
let feeders = [];
let active = -1;
let yaw = 0;
let pitch = 0.12;
let px, py, pz, cx, cy, S, Sx, reach;

function heroHeight() {
  return Math.ceil(offeringRow.getBoundingClientRect().bottom - hero.getBoundingClientRect().top + 28);
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
  reach = measureReach();
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

// How far above its center the drawing can rise, at scale 1, across its swing.
function measureReach() {
  cx = 0;
  cy = 0;
  S = 1;
  Sx = 1;
  let highest = 0;
  [-0.58, 0, 0.58].forEach((y) => {
    [0.05, 0.19].forEach((p) => {
      yaw = y;
      pitch = p;
      for (let i = 0; i < N; i += 4) {
        project(wx[i], wy[i], wz[i]);
        highest = Math.max(highest, -py);
      }
      for (let i = 0; i < D; i += 2) {
        project(dx[i], dy[i], dz[i]);
        highest = Math.max(highest, -py);
      }
    });
  });
  return highest;
}

// Centers the form on the headline and aims a line from there to each offering.
function layout() {
  W = width;
  H = height;
  const heroBox = hero.getBoundingClientRect();
  const text = document.querySelector(".mission-text").getBoundingClientRect();
  cx = W / 2;
  cy = text.top - heroBox.top + text.height / 2;
  // Overall size. The last limit keeps the top of the drawing on the page
  // at every point in its swing; raise the 28 for more room above it.
  const widthLimit = W < 700 ? W / 84 : W / 122;
  S = Math.min(widthLimit, H / 66, (cy - 28) / reach);
  Sx = Math.min(S * 1.45, widthLimit);

  offeringButtons.forEach((button, i) => {
    const box = button.getBoundingClientRect();
    const feeder = feeders[i] || (feeders[i] = { xs: new Float32Array(FEED_N), ys: new Float32Array(FEED_N), packets: [] });
    feeder.ex = box.left - heroBox.left + box.width / 2;
    feeder.ey = box.top - heroBox.top;
  });
}

function windowResized() {
  resizeCanvas(hero.offsetWidth, heroHeight());
  ctx = drawingContext;
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
  px = cx + x1 * f * Sx;
  py = cy + y1 * f * S;
  pz = z2;
}

function pulse(xs, ys, n, pos, span, step) {
  const head = Math.round(pos);
  ctx.lineCap = "round";
  for (let k = -span; k < span; k += step) {
    const i = head + k;
    const j = i + step;
    if (i < 0 || j >= n) continue;
    const g = Math.exp(-Math.pow(k / (span * 0.46), 2));
    ctx.lineWidth = 0.9 + 1.7 * g;
    ctx.strokeStyle = `rgba(${INK},${(0.1 + 0.6 * g).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(xs[i], ys[i]);
    ctx.lineTo(xs[j], ys[j]);
    ctx.stroke();
  }
  if (head >= 0 && head < n) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4;
    ctx.drawImage(sprite, xs[head] - 10, ys[head] - 10, 20, 20);
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

  yaw = Math.sin(t * 0.13) * 0.58;
  pitch = 0.12 + Math.sin(t * 0.09) * 0.07;

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
  feeders.forEach((feeder, i) => {
    const ax = cx;
    const ay = cy;
    const c1y = ay + (feeder.ey - ay) * 0.55;
    const c2y = feeder.ey - (feeder.ey - ay) * 0.5;
    for (let k = 0; k < FEED_N; k++) {
      const u = k / (FEED_N - 1);
      const v = 1 - u;
      feeder.xs[k] = v * v * v * ax + 3 * v * v * u * ax + 3 * v * u * u * feeder.ex + u * u * u * feeder.ex;
      feeder.ys[k] = v * v * v * ay + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * feeder.ey;
    }
    if (feederAlpha > 0) {
      ctx.lineWidth = active === i ? 1.7 : 1;
      ctx.strokeStyle = `rgba(${INK},${((active === i ? 0.9 : 0.5) * feederAlpha).toFixed(3)})`;
      const last = Math.floor((FEED_N - 1) * feederAlpha);
      ctx.beginPath();
      ctx.moveTo(feeder.xs[0], feeder.ys[0]);
      for (let k = 1; k <= last; k++) ctx.lineTo(feeder.xs[k], feeder.ys[k]);
      ctx.stroke();
    }
  });

  // Packets
  if (t > 3.2 && !reduced) {
    packets.forEach((packet) => {
      packet.p += packet.v * dt * 0.42;
      if (packet.p < 40) packet.p = N - 41;
      if (packet.p > N - 41) packet.p = 40;
      pulse(sx, sy, N, packet.p, 30, 2);
    });
    feeders.forEach((feeder) => {
      feeder.packets = feeder.packets.filter((packet) => !(packet.burst && packet.t > 1.05));
      feeder.packets.forEach((packet) => {
        packet.t += packet.v * dt;
        if (!packet.burst) {
          if (packet.t > 1) packet.t = 0;
          if (packet.t < 0) packet.t = 1;
        }
        if (packet.t >= 0 && packet.t <= 1) pulse(feeder.xs, feeder.ys, FEED_N, packet.t * (FEED_N - 1), 8, 1);
      });
    });
  }
}
