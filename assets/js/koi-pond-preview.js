/* ASCII koi pond, adapted from stackedlol/ascii-sharks (MIT). See ascii-sharks.LICENSE.txt. */
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // _animation/koi-pond/src/math.ts
  var TAU = Math.PI * 2;
  var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  var rand = (lo, hi) => lo + Math.random() * (hi - lo);
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function angleDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }
  function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  var K1 = 1 / 260;
  var K2 = 1 / 310;
  var K3 = 1 / 190;

  // _animation/koi-pond/src/world.ts
  var SHARK_NODES = 20;
  var DEFAULT_SHARKS = [
    { kind: "kohaku", size: 1 },
    { kind: "sanke", size: 0.9 },
    { kind: "tancho", size: 0.82 },
    { kind: "ogon", size: 0.88 },
    { kind: "showa", size: 0.95 },
    { kind: "kohaku", size: 0.78 },
    { kind: "shiro", size: 0.76 },
    { kind: "tancho", size: 0.72 }
  ];
  var World = class {
    constructor(sharkSpecs = DEFAULT_SHARKS, _fishCount) {
      __publicField(this, "sharkSpecs", sharkSpecs);
      __publicField(this, "width", 0);
      __publicField(this, "height", 0);
      __publicField(this, "time", 0);
      __publicField(this, "fish", []);
      __publicField(this, "sharks", []);
      __publicField(this, "events", []);
      __publicField(this, "pointer", { x: 0, y: 0, active: false });
      __publicField(this, "destinations", /* @__PURE__ */ new Map());
    }
    resize(width, height, _cellW, _cellH) {
      if (width < 1 || height < 1) return;
      if (this.width === width && this.height === height && this.sharks.length) return;
      const oldWidth = this.width;
      const oldHeight = this.height;
      const oldBase = clamp(Math.min(oldWidth, oldHeight) * 0.38, 130, 360);
      this.width = width;
      this.height = height;
      this.destinations.clear();
      if (!oldWidth || !oldHeight || !this.sharks.length) {
        this.seed();
        return;
      }
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      const newBase = clamp(Math.min(width, height) * 0.38, 130, 360);
      for (const sh of this.sharks) {
        sh.length *= newBase / oldBase;
        sh.orbitRadius = Math.min(width, height) * 0.33;
        sh.heading = Math.atan2(Math.sin(sh.heading) * scaleY, Math.cos(sh.heading) * scaleX);
        for (let k = 0; k < SHARK_NODES; k++) {
          sh.nodes[k * 2] *= scaleX;
          sh.nodes[k * 2 + 1] *= scaleY;
        }
        const seg = sh.length / (SHARK_NODES - 1);
        let sourceX = sh.nodes[0];
        let sourceY = sh.nodes[1];
        for (let k = 1; k < SHARK_NODES; k++) {
          const nextX = sh.nodes[k * 2];
          const nextY = sh.nodes[k * 2 + 1];
          const a = Math.atan2(nextY - sourceY, nextX - sourceX);
          sh.nodes[k * 2] = sh.nodes[(k - 1) * 2] + Math.cos(a) * seg;
          sh.nodes[k * 2 + 1] = sh.nodes[(k - 1) * 2 + 1] + Math.sin(a) * seg;
          sourceX = nextX;
          sourceY = nextY;
        }
      }
    }
    seed() {
      const { width: W, height: H } = this;
      const minSide = Math.min(W, H);
      const baseLength = clamp(minSide * 0.38, 130, 360);
      this.fish = [];
      this.events = [];
      this.destinations.clear();
      this.sharks = this.sharkSpecs.map(({ kind, size }, i) => {
        const length = baseLength * size;
        const a = i / this.sharkSpecs.length * TAU - 0.28 + Math.sin(i * 2.3) * 0.13;
        const orbitDir = i === 2 || i === 5 ? -1 : 1;
        const rx = W * (0.32 + 0.018 * Math.sin(i * 1.7));
        const ry = H * (0.3 + 0.025 * Math.cos(i * 1.3));
        const heading = Math.atan2(ry * Math.cos(a), -rx * Math.sin(a)) + (orbitDir === -1 ? Math.PI : 0);
        const x = W / 2 + Math.cos(a) * rx + Math.cos(heading) * length * 0.45;
        const y = H / 2 + Math.sin(a) * ry + Math.sin(heading) * length * 0.45;
        const nodes = new Float32Array(SHARK_NODES * 2);
        const seg = length / (SHARK_NODES - 1);
        for (let n = 0; n < SHARK_NODES; n++) {
          nodes[n * 2] = x - Math.cos(heading) * seg * n;
          nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
        }
        return {
          id: i + 1,
          kind,
          length,
          nodes,
          heading,
          speed: 20 + length * 0.025,
          phase: rand(0, TAU),
          turn: 0,
          hunger: 0,
          wander: 0,
          orbitDir,
          orbitRadius: minSide * 0.33,
          target: null,
          retargetAt: 0,
          depth: 0.78 + size * 0.22
        };
      });
      this.sharks.sort((a, b) => a.length - b.length);
    }
    splash(x, y) {
      this.events.push({ kind: "splash", x, y });
    }
    step(dt) {
      if (dt <= 0 || !Number.isFinite(dt) || !this.width || !this.height) return;
      this.time += dt;
      const { width: W, height: H, time } = this;
      const cx = W / 2;
      const cy = H / 2;
      for (const sh of this.sharks) {
        const L = sh.length;
        const nodes = sh.nodes;
        const hx = nodes[0];
        const hy = nodes[1];
        const fx = Math.cos(sh.heading);
        const fy = Math.sin(sh.heading);
        let dx = fx * 0.7;
        let dy = fy * 0.7;
        const drift = Math.sin(time * 0.12 + sh.id * 1.9) * 0.16 + Math.sin(time * 0.047 + sh.id) * 0.12;
        sh.wander += (drift - sh.wander) * Math.min(1, dt * 0.6);
        dx += Math.cos(sh.heading + sh.wander) * 0.3;
        dy += Math.sin(sh.heading + sh.wander) * 0.3;
        let destination = this.destinations.get(sh.id);
        if (!destination || time > sh.retargetAt || Math.hypot(destination.x - hx, destination.y - hy) < L * 0.55) {
          destination = this.chooseDestination(sh);
          this.destinations.set(sh.id, destination);
          sh.retargetAt = time + rand(16, 28);
        }
        const goalX = destination.x - hx;
        const goalY = destination.y - hy;
        const goalDistance = Math.hypot(goalX, goalY) || 1;
        dx += goalX / goalDistance * 1.65;
        dy += goalY / goalDistance * 1.65;
        let yielding = 0;
        let avoidX = 0;
        let avoidY = 0;
        for (const other of this.sharks) {
          if (other === sh) continue;
          const ofx = Math.cos(other.heading);
          const ofy = Math.sin(other.heading);
          const vx = fx * sh.speed - ofx * other.speed;
          const vy = fy * sh.speed - ofy * other.speed;
          const vv = vx * vx + vy * vy;
          const clearance = (L + other.length) * 0.12 + Math.min(L, other.length) * 0.08 + 8;
          const range = clearance * 1.9;
          let threat = 0;
          let awayX = 0;
          let awayY = 0;
          for (let a = 0; a <= 14; a += 4) {
            for (let b = 0; b <= 16; b += 4) {
              const ox = nodes[a * 2] - other.nodes[b * 2];
              const oy = nodes[a * 2 + 1] - other.nodes[b * 2 + 1];
              const when = vv > 1 ? clamp(-(ox * vx + oy * vy) / vv, 0, 3.2) : 0;
              const qx = ox + vx * when;
              const qy = oy + vy * when;
              const d = Math.hypot(qx, qy);
              const w = clamp(1 - d / range, 0, 1) * (1 - when * 0.07);
              if (w > threat) {
                threat = w;
                const norm = d || 1;
                awayX = qx / norm;
                awayY = qy / norm;
              }
            }
          }
          if (threat > 0) {
            const opposing = fx * ofx + fy * ofy < -0.45;
            const side = opposing ? 1 : -fy * awayX + fx * awayY >= 0 ? 1 : -1;
            const strength = threat * threat * 3.2;
            avoidX += (awayX * 0.55 - fy * side) * strength;
            avoidY += (awayY * 0.55 + fx * side) * strength;
            const inFront = (other.nodes[0] - hx) * fx + (other.nodes[1] - hy) * fy > 0;
            const following = fx * ofx + fy * ofy > 0.5 && inFront;
            if (following || sh.id > other.id) yielding = Math.max(yielding, threat);
          }
        }
        const avoidLength = Math.hypot(avoidX, avoidY) || 1;
        const avoidScale = Math.min(1, 2.4 / avoidLength);
        dx += avoidX * avoidScale;
        dy += avoidY * avoidScale;
        const ahead = L * 0.65 + sh.speed * 0.6;
        const px = hx + fx * ahead;
        const py = hy + fy * ahead;
        const textX = (px - cx) / (W * 0.21 + L * 0.06);
        const textY = (py - cy) / (H * 0.105 + L * 0.08);
        const textDistance = Math.hypot(textX, textY);
        if (textDistance < 1.15) {
          const d = textDistance || 1;
          const w = (1.15 - textDistance) * 3;
          dx += textX / d * w;
          dy += textY / d * w;
        }
        const margin = 22 + L * 0.22;
        if (px < margin) dx = Math.max(dx, 0.7 + (margin - px) / margin * 3.4);
        if (px > W - margin) dx = Math.min(dx, -0.7 - (px - W + margin) / margin * 3.4);
        if (py < margin) dy = Math.max(dy, 0.7 + (margin - py) / margin * 3.4);
        if (py > H - margin) dy = Math.min(dy, -0.7 - (py - H + margin) / margin * 3.4);
        const edge = 24 + L * 0.42;
        if (hx < edge) dx = Math.max(dx, (edge - hx) / edge * 4);
        if (hx > W - edge) dx = Math.min(dx, -(hx - W + edge) / edge * 4);
        if (hy < edge) dy = Math.max(dy, (edge - hy) / edge * 4);
        if (hy > H - edge) dy = Math.min(dy, -(hy - H + edge) / edge * 4);
        let desired = Math.atan2(dy, dx);
        const safeEdge = L * 0.38 + 24;
        if (Math.min(hx, W - hx, hy, H - hy) < safeEdge) {
          desired = Math.atan2(cy - hy, cx - hx);
        }
        const agility = Math.min(0.68, (20 + L * 0.025) / (L * 0.26));
        const turned = clamp(angleDiff(sh.heading, desired), -agility * dt, agility * dt);
        sh.heading += turned;
        sh.turn += (turned / dt - sh.turn) * Math.min(1, dt * 2.5);
        const cruise = (20 + L * 0.025) * (1 + 0.065 * Math.sin(time * 0.11 + sh.id));
        const targetSpeed = cruise * (1 - yielding * 0.45);
        sh.speed += (targetSpeed - sh.speed) * Math.min(1, dt * 0.9);
        sh.phase += dt * (1.5 + sh.speed / 34);
        nodes[0] += Math.cos(sh.heading) * sh.speed * dt;
        nodes[1] += Math.sin(sh.heading) * sh.speed * dt;
        const seg = L / (SHARK_NODES - 1);
        let prevAngle = sh.heading + Math.PI;
        for (let k = 1; k < SHARK_NODES; k++) {
          const x = nodes[(k - 1) * 2];
          const y = nodes[(k - 1) * 2 + 1];
          const s = k / (SHARK_NODES - 1);
          const maxBend = 0.04 + 0.125 * s * s;
          let angle = Math.atan2(nodes[k * 2 + 1] - y, nodes[k * 2] - x);
          angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
          nodes[k * 2] = x + Math.cos(angle) * seg;
          nodes[k * 2 + 1] = y + Math.sin(angle) * seg;
          prevAngle = angle;
        }
      }
    }
    /** Pick an open part of the pond, with a forward preference and separate destinations. */
    chooseDestination(sh) {
      const W = this.width;
      const H = this.height;
      const hx = sh.nodes[0];
      const hy = sh.nodes[1];
      let best = { x: W / 2, y: H * 0.2 };
      let bestScore = -Infinity;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if ((row === 1 || row === 2) && (col === 1 || col === 2)) continue;
          const x = W * (0.14 + col * 0.24 + rand(-0.025, 0.025));
          const y = H * (0.14 + row * 0.24 + rand(-0.025, 0.025));
          const dx = x - hx;
          const dy = y - hy;
          const d = Math.hypot(dx, dy);
          if (d < sh.length * 0.8) continue;
          let room = 3;
          for (const other of this.sharks) {
            if (other === sh) continue;
            room = Math.min(room, Math.hypot(x - other.nodes[12], y - other.nodes[13]) / ((sh.length + other.length) * 0.55));
            const goal = this.destinations.get(other.id);
            if (goal) room = Math.min(room, Math.hypot(x - goal.x, y - goal.y) / (sh.length * 0.9));
          }
          const forward = (dx * Math.cos(sh.heading) + dy * Math.sin(sh.heading)) / d;
          const score = room + forward * 0.8 - d / Math.max(W, H) * 0.25 + rand(0, 0.18);
          if (score > bestScore) {
            bestScore = score;
            best = { x, y };
          }
        }
      }
      return best;
    }
  };

  // _animation/koi-pond/src/renderer.ts
  var ALPHA_LEVELS = 6;
  var FISH_ALPHAS = [0.28, 0.42, 0.58, 0.74, 0.9];
  var DOT_RGB = [
    [48, 52, 235],
    [52, 205, 60],
    [228, 50, 44],
    [190, 212, 255],
    [110, 230, 255]
  ];
  var DOT_BASE_ALPHA = [1, 1, 1, 1, 1];
  var WAKE = DOT_RGB.length - 1;
  var FLAG_BODY = 1;
  var FLAG_EDGE = 2;
  var FLAG_FIN = 3;
  var FLAG_RIDGE = 4;
  var FLAG_EYE = 5;
  var SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];
  function koiHalfWidth(s) {
    if (s < 0.04) return 0.034 + 0.033 * smoothstep(0, 0.04, s);
    if (s < 0.22) return 0.067 + 0.045 * smoothstep(0.04, 0.22, s);
    if (s < 0.36) return 0.112 + 8e-3 * Math.sin((s - 0.22) / 0.14 * Math.PI);
    if (s < 0.8) return 0.021 + 0.091 * Math.pow(1 - (s - 0.36) / 0.44, 1.05);
    if (s < 0.86) return 0.021 - 6e-3 * smoothstep(0.8, 0.86, s);
    return 0;
  }
  var KOI_SHAPE = {
    halfWidth: koiHalfWidth,
    pectoral: [0.19, 0.43, 0.34, 0.195],
    tint: [1, 1, 1]
  };
  var SHAPES = {
    kohaku: KOI_SHAPE,
    sanke: KOI_SHAPE,
    showa: KOI_SHAPE,
    tancho: KOI_SHAPE,
    ogon: KOI_SHAPE,
    shiro: KOI_SHAPE
  };
  var KOI_COLORS = [[239, 232, 210], [220, 65, 37], [34, 44, 40], [230, 177, 64]];
  var KINDS = Object.keys(SHAPES);
  var AsciiRenderer = class {
    constructor(canvas2) {
      __publicField(this, "canvas", canvas2);
      __publicField(this, "ctx");
      __publicField(this, "bg");
      __publicField(this, "dpr", 1);
      __publicField(this, "width", 0);
      __publicField(this, "height", 0);
      __publicField(this, "cw", 12);
      __publicField(this, "ch", 18);
      __publicField(this, "cols", 0);
      __publicField(this, "rows", 0);
      __publicField(this, "fontFamily", "ui-monospace, Menlo, monospace");
      __publicField(this, "dotKind", new Uint8Array(0));
      // 0 none, 1 blue, 2 green, 3 red, 4 pale
      __publicField(this, "dotPhase", new Float32Array(0));
      __publicField(this, "dotFreq", new Float32Array(0));
      __publicField(this, "energy", new Float32Array(0));
      __publicField(this, "energyTmp", new Float32Array(0));
      __publicField(this, "heat", new Float32Array(0));
      __publicField(this, "bucketOf", new Uint8Array(0));
      __publicField(this, "bucketOrder", new Int32Array(0));
      __publicField(this, "bucketCounts", new Int32Array(DOT_RGB.length * ALPHA_LEVELS + 1));
      __publicField(this, "dotStyles", []);
      __publicField(this, "sharkFlag", new Uint8Array(0));
      __publicField(this, "sharkShade", new Float32Array(0));
      __publicField(this, "sharkKey", new Uint32Array(0));
      __publicField(this, "sharkDepth", new Float32Array(0));
      __publicField(this, "sharkKind", new Uint8Array(0));
      /** Cells darkened by a shark's shadow on the seabed. */
      __publicField(this, "sharkShadow", new Uint8Array(0));
      __publicField(this, "spine", new Float32Array(SHARK_NODES * 2));
      __publicField(this, "arc", new Float32Array(SHARK_NODES));
      __publicField(this, "arcTotal", 1);
      __publicField(this, "shape", SHAPES.kohaku);
      __publicField(this, "currentKind", "kohaku");
      __publicField(this, "light", false);
      __publicField(this, "material", new Uint8Array(0));
      __publicField(this, "ripples", []);
      __publicField(this, "sharkId", 0);
      __publicField(this, "finTipLeft", 0);
      __publicField(this, "finTipRight", 0);
      // Scratch outputs of sampleShark(), to avoid allocating per sample.
      __publicField(this, "hitFlag", 0);
      __publicField(this, "hitShade", 0);
      __publicField(this, "hitS", 0);
      __publicField(this, "hitV", 0);
      __publicField(this, "hitDist", 0);
      /** Cells holding a fish this frame (frame stamp); dots skip them. */
      __publicField(this, "fishStamp", new Uint32Array(0));
      __publicField(this, "frameId", 0);
      /** Fish cells bucketed by brightness, so each bucket is one fillStyle. */
      __publicField(this, "fishBuckets", FISH_ALPHAS.map(() => []));
      __publicField(this, "fishStyles", FISH_ALPHAS.map((a) => `rgba(230,238,255,${a})`));
      const ctx = canvas2.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("2D canvas unavailable");
      this.ctx = ctx;
      this.bg = document.createElement("canvas");
      for (let c = 0; c < DOT_RGB.length; c++) {
        const [r, g, b] = DOT_RGB[c];
        for (let l = 0; l < ALPHA_LEVELS; l++) {
          const a = DOT_BASE_ALPHA[c] * (l + 1) / ALPHA_LEVELS;
          this.dotStyles.push(`rgba(${r},${g},${b},${a.toFixed(3)})`);
        }
      }
    }
    get cellWidth() {
      return this.cw;
    }
    get cellHeight() {
      return this.ch;
    }
    setFontFamily(family) {
      if (family) this.fontFamily = family;
    }
    resize(width, height, dpr) {
      const prevCols = this.cols;
      const prevRows = this.rows;
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.cw = clamp(Math.round(width / 150), 6, 10);
      this.ch = Math.round(this.cw * 1.4);
      this.cols = Math.ceil(width / this.cw);
      this.rows = Math.ceil(height / this.ch);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.bg.width = this.canvas.width;
      this.bg.height = this.canvas.height;
      const n = this.cols * this.rows;
      if (this.cols !== prevCols || this.rows !== prevRows) {
        this.dotKind = new Uint8Array(n);
        this.dotPhase = new Float32Array(n);
        this.dotFreq = new Float32Array(n);
        this.energy = new Float32Array(n);
        this.energyTmp = new Float32Array(n);
        this.heat = new Float32Array(n);
        this.bucketOf = new Uint8Array(n);
        this.bucketOrder = new Int32Array(n);
        this.sharkFlag = new Uint8Array(n);
        this.sharkShade = new Float32Array(n);
        this.sharkKey = new Uint32Array(n);
        this.sharkDepth = new Float32Array(n);
        this.sharkKind = new Uint8Array(n);
        this.material = new Uint8Array(n);
        this.sharkShadow = new Uint8Array(n);
        this.fishStamp = new Uint32Array(n);
      }
      for (let i = 0; i < n; i++) {
        const col = i % this.cols;
        const row = i / this.cols | 0;
        this.dotKind[i] = 0;
        this.dotPhase[i] = hash3(col, row, 23) * Math.PI * 2;
        this.dotFreq[i] = 0.3 + hash3(col, row, 37) * 1.1;
      }
      this.paintBackground();
    }
    setTheme(light) {
      this.light = light;
      this.dotStyles = [];
      for (let c = 0; c < DOT_RGB.length; c++) {
        for (let l = 0; l < ALPHA_LEVELS; l++) {
          const alpha = (l + 1) / ALPHA_LEVELS * (light ? 0.28 : 0.2);
          this.dotStyles.push(light ? `rgba(63,115,95,${alpha})` : `rgba(73,80,74,${alpha})`);
        }
      }
      this.paintBackground();
    }
    paintBackground() {
      const g = this.bg.getContext("2d");
      if (!g) return;
      const { width: W, height: H, dpr, cw, ch } = this;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wash = g.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
      wash.addColorStop(0, this.light ? "#e7eee1" : "#e2e0d8");
      wash.addColorStop(0.6, this.light ? "#f0f2e8" : "#eceae2");
      wash.addColorStop(1, this.light ? "#e2e9dd" : "#d3d2cb");
      g.fillStyle = wash;
      g.fillRect(0, 0, W, H);
      if (!this.light) {
        const bloom = (x, y, rx, ry, alpha) => {
          g.save();
          g.translate(x, y);
          g.scale(rx, ry);
          const ink = g.createRadialGradient(-0.12, 0.06, 0, 0, 0, 1);
          ink.addColorStop(0, `rgba(70,79,71,${alpha})`);
          ink.addColorStop(0.44, `rgba(80,86,77,${alpha * 0.48})`);
          ink.addColorStop(1, "rgba(80,86,77,0)");
          g.fillStyle = ink;
          g.fillRect(-1, -1, 2, 2);
          g.restore();
        };
        bloom(-W * 0.05, H * 0.72, W * 0.48, H * 0.52, 0.16);
        bloom(W * 0.06, H * 0.96, W * 0.39, H * 0.22, 0.08);
        bloom(W * 1.04, H * 0.15, W * 0.51, H * 0.46, 0.12);
        bloom(W * 0.92, -H * 0.03, W * 0.29, H * 0.3, 0.07);
      }
      g.strokeStyle = this.light ? "rgba(45,80,60,0.025)" : "rgba(79,83,74,0.006)";
      g.lineWidth = 0.6;
      g.beginPath();
      for (let x = 0; x < W; x += cw) {
        g.moveTo(x, 0);
        g.lineTo(x, H);
      }
      for (let y = 0; y < H; y += ch) {
        g.moveTo(0, y);
        g.lineTo(W, y);
      }
      g.stroke();
    }
    drawWater(t) {
      const { ctx, cols, rows, cw, ch } = this;
      ctx.font = `400 ${Math.round(ch * 0.72)}px ${this.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.ripples = this.ripples.filter((r) => t - r.born < r.life);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (this.sharkFlag[i]) continue;
          const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
          const wave = Math.sin(c * 0.105 + r * 0.14 + t * 0.17) + Math.sin(c * -0.08 + r * 0.19 - t * 0.13);
          let a = wave > 1.93 ? 0.075 : 0;
          if (!a || hash3(c, r, 71) < 0.3) continue;
          ctx.fillStyle = this.light ? `rgba(56,96,74,${a})` : `rgba(73,80,74,${a})`;
          ctx.fillText("\xB7", x, y);
        }
      }
      ctx.fillStyle = this.light ? "rgba(39,70,50,0.06)" : "rgba(48,54,48,0.05)";
      for (let i = 0; i < this.sharkShadow.length; i++) {
        if (this.sharkShadow[i] && !this.sharkFlag[i])
          ctx.fillRect(i % cols * cw, Math.floor(i / cols) * ch, cw, ch);
      }
    }
    render(world, dt) {
      const { ctx, dpr, cols, ch } = this;
      if (cols === 0) return;
      const t = world.time;
      this.consumeEvents(world);
      this.rasterizeSharks(world.sharks, t);
      this.depositWake(world);
      this.diffuse(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.bg, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawWater(t);
      this.markFish(world);
      this.drawDots(t);
      ctx.font = `600 ${Math.round(ch * 0.74)}px ${this.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.drawHeat();
      this.drawFish();
      this.drawSharks(t);
      this.drawRipples(t);
    }
    drawRipples(t) {
      const { ctx, cw, ch, cols, rows } = this;
      ctx.save();
      ctx.font = `400 ${Math.round(ch * 0.82)}px ${this.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const band = Math.hypot(cw, ch) * 0.58;
      for (const ring of this.ripples) {
        const age = t - ring.born;
        if (age <= 0 || age >= ring.life) continue;
        const radius = age * ring.speed;
        const fade = Math.min(1, age / 0.16) * Math.pow(1 - age / ring.life, 1.35) * ring.strength;
        const c0 = Math.max(0, Math.floor((ring.x - radius - band) / cw));
        const c1 = Math.min(cols - 1, Math.ceil((ring.x + radius + band) / cw));
        const r0 = Math.max(0, Math.floor((ring.y - radius - band) / ch));
        const r1 = Math.min(rows - 1, Math.ceil((ring.y + radius + band) / ch));
        for (let row = r0; row <= r1; row++) {
          for (let col = c0; col <= c1; col++) {
            const x = (col + 0.5) * cw, y = (row + 0.5) * ch;
            const dx = x - ring.x, dy = y - ring.y;
            const distance = Math.hypot(dx, dy);
            const coverage = 1 - Math.abs(distance - radius) / band;
            if (coverage <= 0) continue;
            const alpha = fade * (0.35 + 0.65 * coverage);
            ctx.fillStyle = this.light ? `rgba(66,97,79,${alpha})` : `rgba(63,69,63,${alpha})`;
            const glyph = coverage < 0.35 ? "." : Math.abs(dy) > distance * 0.78 ? "-" : ":";
            ctx.fillText(glyph, x, y + 1);
          }
        }
      }
      ctx.restore();
    }
    // ── simulation → field ──────────────────────────────────────────────
    cellIndex(x, y) {
      const c = Math.floor(x / this.cw);
      const r = Math.floor(y / this.ch);
      if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
      return r * this.cols + c;
    }
    stamp(field, x, y, radius, amount) {
      const c0 = Math.floor(x / this.cw);
      const r0 = Math.floor(y / this.ch);
      for (let r = r0 - radius; r <= r0 + radius; r++) {
        for (let c = c0 - radius; c <= c0 + radius; c++) {
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
          const d = Math.hypot(c - c0, (r - r0) * 1.4);
          if (d > radius + 0.5) continue;
          const i = r * this.cols + c;
          field[i] = Math.min(1.6, field[i] + amount * (1 - d / (radius + 1)));
        }
      }
    }
    consumeEvents(world) {
      for (const e of world.events) {
        if (e.kind !== "splash") continue;
        this.ripples.push({ x: e.x, y: e.y, born: world.time, life: 5.2, speed: 72, strength: 0.62 });
        this.ripples.push({ x: e.x, y: e.y, born: world.time + 0.35, life: 4.6, speed: 64, strength: 0.34 });
        if (this.ripples.length > 12) this.ripples.splice(0, this.ripples.length - 12);
      }
      world.events.length = 0;
    }
    depositWake(world) {
      const { energy } = this;
      for (const f of world.fish) {
        if (!f.alive) continue;
        const i = this.cellIndex(f.x, f.y);
        if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.012 + f.alarm * 0.03);
      }
      for (const sh of world.sharks) {
        for (let k = SHARK_NODES - 6; k < SHARK_NODES; k++) {
          const i = this.cellIndex(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
          if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.035 + sh.speed * 8e-4);
        }
      }
      if (world.pointer.active) {
        this.stamp(energy, world.pointer.x, world.pointer.y, 1, 0.08);
      }
    }
    /** Blur + decay so wakes spread out like ripples and fade. */
    diffuse(dt) {
      const { cols, rows, energy, energyTmp: tmp, heat } = this;
      const decay = Math.exp(-dt * 1.5);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const l = c > 0 ? energy[i - 1] : energy[i];
          const rt = c < cols - 1 ? energy[i + 1] : energy[i];
          const u = r > 0 ? energy[i - cols] : energy[i];
          const d = r < rows - 1 ? energy[i + cols] : energy[i];
          tmp[i] = (energy[i] * 4 + l + rt + u + d) * 0.125 * decay;
        }
      }
      this.energy = tmp;
      this.energyTmp = energy;
      const heatDecay = Math.exp(-dt * 2.2);
      for (let i = 0; i < heat.length; i++) heat[i] *= heatDecay;
    }
    // ── sharks ──────────────────────────────────────────────────────────
    /**
     * Classify one point against the current shark (spine/arc already built).
     * Body coordinates: s along the spine (0 snout → 1 tail), v across it.
     * Writes hit* fields and returns whether the point is on the shark.
     */
    sampleShark(px, py, L) {
      const { spine, arc } = this;
      const N = SHARK_NODES;
      let best = Infinity;
      let bestS = 0;
      let bestSign = 1;
      let bestNx = 0;
      let bestNy = 0;
      for (let k = 0; k < N - 1; k++) {
        const ax = spine[k * 2];
        const ay = spine[k * 2 + 1];
        const sx = spine[(k + 1) * 2] - ax;
        const sy = spine[(k + 1) * 2 + 1] - ay;
        const len2 = sx * sx + sy * sy || 1;
        const u2 = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
        const qx = ax + sx * u2;
        const qy = ay + sy * u2;
        const d2 = (px - qx) ** 2 + (py - qy) ** 2;
        if (d2 < best) {
          best = d2;
          const len = Math.sqrt(len2);
          bestS = (arc[k] + u2 * len) / this.arcTotal;
          bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
          bestNx = -sy / len * bestSign;
          bestNy = sx / len * bestSign;
        }
      }
      const a = Math.sqrt(best);
      const s = bestS;
      const u = s * L;
      const shape = this.shape;
      const w = shape.halfWidth(s) * L;
      this.hitDist = a;
      this.hitS = s;
      this.hitV = a * bestSign;
      if (a <= w && s < 0.86) {
        const across = a / (w || 1);
        const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
        this.hitFlag = FLAG_BODY;
        this.hitShade = clamp(0.84 - across * across * 0.34 + facing * 0.12, 0, 1);
        if (s > 0.075 && s < 0.12 && across > 0.78) {
          this.hitFlag = FLAG_EYE;
        } else if (s > 0.32 && s < 0.66 && across < 0.12) {
          this.hitFlag = FLAG_RIDGE;
          this.hitShade += 0.04;
        } else if (s > 0.19 && s < 0.205 && across > 0.58) {
          this.hitShade *= 0.85;
        }
        return true;
      }
      const reach = (bestSign > 0 ? this.finTipRight : this.finTipLeft) / L;
      const av = a / L;
      const spread = clamp(av / reach, 0, 1);
      const center = 0.25 + spread * 0.085;
      const fan = ((s - center) / 0.098) ** 2 + ((av - 0.108) / (reach - 0.108)) ** 2;
      if (av > 0.075 && fan < 1 && s > 0.19) {
        this.hitFlag = FLAG_FIN;
        this.hitShade = 0.38 + 0.16 * Math.cos((s - center) * 150 + av * 22);
        return true;
      }
      if (((s - 0.65 - av * 0.22) / 0.065) ** 2 + ((av - 0.052) / 0.039) ** 2 < 1) {
        this.hitFlag = FLAG_FIN;
        this.hitShade = 0.42;
        return true;
      }
      if (s >= 0.79 && s < 0.998) {
        const k = (s - 0.79) / 0.208;
        const outer = 0.017 + 0.115 * Math.pow(k, 0.8);
        const notch = k > 0.62 ? 0.09 * Math.pow((k - 0.62) / 0.38, 0.8) : 0;
        const rounded = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, k - 0.86) / 0.14, 2))) * 0.035;
        if (av < Math.min(outer, 0.1 + rounded) && av > notch) {
          this.hitFlag = FLAG_FIN;
          this.hitShade = 0.4 + 0.12 * Math.cos(av / (0.03 + k * 0.1) * 26);
          return true;
        }
      }
      return false;
    }
    /** Large, asymmetric pigment islands, anchored to skin rather than screen pixels. */
    pigment(s, v) {
      const kind = this.currentKind;
      if (kind === "ogon") return 3;
      const variant = this.sharkId === 6;
      const wobble = Math.sin(s * 43 + v * 37 + this.sharkId) * 7e-3 + Math.sin(s * 87 - v * 25) * 3e-3;
      const patch = (cx, cy, rx, ry) => ((s - cx + wobble) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1;
      if (kind === "tancho") return patch(0.135, 0, 0.06, 0.057) ? 1 : 0;
      if (kind === "shiro") {
        return patch(0.11, -0.035, 0.1, 0.075) || patch(0.35, 0.045, 0.12, 0.13) || patch(0.62, -0.025, 0.12, 0.095) ? 2 : 0;
      }
      const red = patch(0.12, 8e-3, 0.105, 0.065) || patch(variant ? 0.34 : 0.36, variant ? -0.04 : 0.026, variant ? 0.18 : 0.115, 0.125) || patch(variant ? 0.59 : 0.65, -0.022, variant ? 0.1 : 0.08, 0.09);
      if (kind === "showa") {
        const ink = patch(0.15, -0.05, 0.105, 0.04) || patch(0.44, 0.055, 0.09, 0.14) || patch(0.73, -0.02, 0.075, 0.09);
        if (ink) return 2;
      }
      if (kind === "sanke" && s > 0.23) {
        const ink = patch(0.285, -0.05, 0.042, 0.035) || patch(0.51, 0.035, 0.04, 0.032) || patch(0.71, -0.018, 0.027, 0.033);
        if (ink) return 2;
      }
      return red ? 1 : 0;
    }
    /**
     * Build a smooth, undulating render spine from the sim spine, then
     * supersample every cell in the shark's bounding box against the shape.
     * Fully covered cells become solid skin; partial cells become edge glyphs.
     */
    rasterizeSharks(sharks, t) {
      const { sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind, sharkShadow, spine, arc, cw, ch, cols, rows } = this;
      sharkFlag.fill(0);
      sharkShadow.fill(0);
      for (const sh of sharks) {
        const L = sh.length;
        const N = SHARK_NODES;
        const n = sh.nodes;
        const swim = clamp(sh.speed / 60, 0.4, 1.4);
        this.shape = SHAPES[sh.kind];
        this.currentKind = sh.kind;
        this.sharkId = sh.id;
        const kindIndex = KINDS.indexOf(sh.kind);
        for (let k = 0; k < N; k++) {
          const s = k / (N - 1);
          const a = Math.max(0, k - 1);
          const b = Math.min(N - 1, k + 1);
          let tx = n[a * 2] - n[b * 2];
          let ty = n[a * 2 + 1] - n[b * 2 + 1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl;
          ty /= tl;
          const amp = L * 0.042 * (0.01 + 0.99 * Math.pow(s, 2.2)) * swim;
          const off = amp * Math.sin(sh.phase - s * 5.2);
          spine[k * 2] = n[k * 2] - ty * off;
          spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
        }
        arc[0] = 0;
        for (let k = 1; k < N; k++) {
          arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
        }
        this.arcTotal = arc[N - 1] || 1;
        const bank = clamp(sh.turn * 0.45, -0.35, 0.35);
        const flex = 1 + 0.06 * Math.sin(sh.phase * 0.5);
        const reachFin = this.shape.pectoral[3];
        this.finTipRight = L * reachFin * flex * (1 - bank);
        this.finTipLeft = L * reachFin * flex * (1 + bank);
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let k = 0; k < N; k++) {
          minX = Math.min(minX, spine[k * 2]);
          maxX = Math.max(maxX, spine[k * 2]);
          minY = Math.min(minY, spine[k * 2 + 1]);
          maxY = Math.max(maxY, spine[k * 2 + 1]);
        }
        const reach = L * 0.36;
        const c0 = Math.max(0, Math.floor((minX - reach) / cw));
        const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
        const r0 = Math.max(0, Math.floor((minY - reach) / ch));
        const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
        if (c0 > c1 || r0 > r1) continue;
        const skipBeyond = reach + Math.hypot(cw, ch);
        const shadowDc = Math.round(L * 0.035 / cw) + 1;
        const shadowDr = Math.round(L * 0.02 / ch) + 1;
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const x = c * cw;
            const y = r * ch;
            const centerHit = this.sampleShark(x + cw / 2, y + ch / 2, L);
            if (!centerHit && this.hitDist > skipBeyond) continue;
            const flag = this.hitFlag;
            const shade = this.hitShade;
            const s = this.hitS;
            const v = this.hitV;
            let hits = centerHit ? 1 : 0;
            for (let k = 0; k < SUBSAMPLES.length; k += 2) {
              if (this.sampleShark(x + SUBSAMPLES[k] * cw, y + SUBSAMPLES[k + 1] * ch, L)) hits++;
            }
            if (hits === 0) continue;
            const coverage = hits / 5;
            const i = r * cols + c;
            const key = hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) * 4294967295 >>> 0;
            sharkKey[i] = key;
            sharkDepth[i] = sh.depth;
            sharkKind[i] = kindIndex;
            this.material[i] = flag === FLAG_FIN ? sh.kind === "ogon" ? 3 : 0 : this.pigment(s, v / L);
            if (centerHit && coverage >= 0.6) {
              sharkFlag[i] = flag;
              const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;
              sharkShade[i] = clamp(shade + flicker, 0, 1);
              const sc = c + shadowDc;
              const sr = r + shadowDr;
              if (sc < cols && sr < rows) sharkShadow[sr * cols + sc] = 1;
            } else {
              sharkFlag[i] = FLAG_EDGE;
              sharkShade[i] = coverage;
            }
          }
        }
      }
    }
    drawSharks(_t) {
      const { ctx, cols, rows, cw, ch, sharkFlag, sharkShade, sharkKey, sharkDepth } = this;
      const n = cols * rows;
      for (let i = 0; i < n; i++) {
        const flag = sharkFlag[i];
        if (!flag) continue;
        const x = i % cols * cw, y = Math.floor(i / cols) * ch;
        const key = sharkKey[i], shade = sharkShade[i];
        const pigment = this.material[i];
        const color = KOI_COLORS[pigment];
        const dim = 0.84 + 0.16 * sharkDepth[i];
        const light = (0.66 + shade * 0.37) * dim;
        const rgb = color.map((c) => Math.round(c * light));
        if (flag === FLAG_EDGE) {
          ctx.globalAlpha = 0.36 + shade * 0.5;
          ctx.fillStyle = `rgb(${rgb.join(",")})`;
          ctx.fillText(shade > 0.4 ? ":" : ".", x + cw / 2, y + ch / 2 + 1);
          ctx.globalAlpha = 1;
          continue;
        }
        const fin = flag === FLAG_FIN;
        ctx.globalAlpha = fin ? 0.38 + shade * 0.3 : 1;
        ctx.fillStyle = flag === FLAG_EYE ? "#25332c" : `rgb(${rgb.join(",")})`;
        ctx.fillRect(x + 0.65, y + 0.65, cw - 0.65, ch - 0.65);
        ctx.globalAlpha = 1;
        const glyphs = fin ? "/:;" : pigment === 2 ? ":;x%" : ":;=x%S";
        const glyph = flag === FLAG_EYE ? "\xB7" : glyphs[(key >>> 8) % glyphs.length];
        ctx.fillStyle = flag === FLAG_EYE ? "rgba(224,218,190,0.55)" : pigment === 2 ? "rgba(150,163,135,0.32)" : fin ? this.light ? "rgba(54,82,58,0.24)" : "rgba(73,80,74,0.22)" : `rgba(36,48,35,${0.42 + (1 - shade) * 0.13})`;
        ctx.fillText(glyph, x + cw / 2, y + ch / 2 + 1);
      }
    }
    // ── fish, dots, heat ────────────────────────────────────────────────
    /**
     * Snap each fish to a cell and bucket it by brightness: far fish are dim,
     * near fish brighter, and turning or panicking fish glint. Nearer fish
     * claim a cell first when two land in the same one.
     */
    markFish(world) {
      const { fishStamp, fishBuckets, sharkFlag } = this;
      const frame = ++this.frameId;
      for (const bucket of fishBuckets) bucket.length = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (const f of world.fish) {
          if (!f.alive || (f.depth > 0.78 ? 0 : 1) !== pass) continue;
          const i = this.cellIndex(f.x, f.y);
          if (i < 0 || fishStamp[i] === frame || sharkFlag[i]) continue;
          fishStamp[i] = frame;
          const glint = clamp(Math.abs(f.turn) / 3.5, 0, 1);
          const v = 0.3 + 0.4 * (f.depth - 0.55) / 0.45 + 0.3 * Math.max(glint, f.alarm);
          fishBuckets[clamp(Math.floor(v * FISH_ALPHAS.length), 0, FISH_ALPHAS.length - 1)].push(i);
        }
      }
    }
    drawFish() {
      const { ctx, cw, ch, cols, fishBuckets } = this;
      for (let b = 0; b < fishBuckets.length; b++) {
        const bucket = fishBuckets[b];
        if (!bucket.length) continue;
        ctx.fillStyle = this.fishStyles[b];
        for (const i of bucket) {
          ctx.fillText("-", i % cols * cw + cw / 2, (i / cols | 0) * ch + ch / 2 + 1);
        }
      }
    }
    drawHeat() {
      const { ctx, heat, cols, cw, ch } = this;
      for (let i = 0; i < heat.length; i++) {
        const h = heat[i];
        if (h < 0.08) continue;
        const col = i % cols;
        const row = i / cols | 0;
        ctx.fillStyle = h > 0.5 ? `rgba(255,120,60,${h.toFixed(2)})` : `rgba(220,40,40,${(h * 1.6).toFixed(2)})`;
        ctx.fillText(h > 0.6 ? "*" : "\xB7", col * cw + cw / 2, row * ch + ch / 2 + 1);
      }
    }
    /**
     * Every cell's dot twinkles on its own clock, is modulated by slow
     * caustic light bands, and flares cyan where the wake field is strong.
     * Dots are bucketed by colour/alpha so each bucket is one fillStyle.
     */
    drawDots(t) {
      const { ctx, cols, rows, cw, ch, dotKind, dotPhase, dotFreq, energy, sharkFlag, sharkShadow, fishStamp, frameId } = this;
      const { bucketOf, bucketOrder, bucketCounts } = this;
      const n = cols * rows;
      const SKIP = bucketCounts.length - 1;
      bucketCounts.fill(0);
      for (let i = 0; i < n; i++) {
        const e = energy[i];
        const kind = dotKind[i];
        if (sharkFlag[i] || fishStamp[i] === frameId || kind === 0 && e < 0.45) {
          bucketOf[i] = SKIP;
          continue;
        }
        let bucket;
        if (e > 0.45) {
          const level = clamp(Math.floor((e - 0.45) * 5), 0, ALPHA_LEVELS - 1);
          bucket = WAKE * ALPHA_LEVELS + level;
        } else {
          const col = i % cols;
          const row = i / cols | 0;
          const twinkle = 0.5 + 0.5 * Math.sin(t * dotFreq[i] + dotPhase[i]);
          const caustic = 0.85 + 0.15 * Math.sin(col * 0.11 + t * 0.35) * Math.sin(row * 0.17 - t * 0.27);
          let v = clamp((0.55 + 0.45 * twinkle) * caustic + e * 2, 0, 1);
          if (sharkShadow[i]) v *= 0.2;
          bucket = (kind - 1) * ALPHA_LEVELS + clamp(Math.floor(v * ALPHA_LEVELS), 0, ALPHA_LEVELS - 1);
        }
        bucketOf[i] = bucket;
        bucketCounts[bucket]++;
      }
      const starts = new Int32Array(bucketCounts.length);
      for (let b = 1; b < bucketCounts.length; b++) starts[b] = starts[b - 1] + bucketCounts[b - 1];
      const cursor = starts.slice();
      for (let i = 0; i < n; i++) {
        const b = bucketOf[i];
        if (b !== SKIP) bucketOrder[cursor[b]++] = i;
      }
      const small = Math.max(2, Math.round(cw * 0.19));
      const large = small + 1;
      for (let b = 0; b < SKIP; b++) {
        const count = bucketCounts[b];
        if (!count) continue;
        ctx.fillStyle = this.dotStyles[b];
        const size = b >= WAKE * ALPHA_LEVELS ? large : small;
        const start = starts[b];
        for (let k = start; k < start + count; k++) {
          const i = bucketOrder[k];
          const col = i % cols;
          const row = i / cols | 0;
          ctx.fillRect(Math.round(col * cw + cw * 0.66 - size / 2), Math.round(row * ch + ch * 0.64 - size / 2), size, size);
        }
      }
    }
  };

  // _animation/koi-pond/src/engine.ts
  var STEP = 1 / 60;
  var MAX_STEPS = 4;
  var OceanEngine = class {
    constructor(canvas2, sharks) {
      __publicField(this, "canvas", canvas2);
      __publicField(this, "world");
      __publicField(this, "renderer");
      __publicField(this, "raf", 0);
      __publicField(this, "last", 0);
      __publicField(this, "acc", 0);
      __publicField(this, "visible", true);
      __publicField(this, "reducedMotion");
      __publicField(this, "resizeObserver");
      __publicField(this, "intersectionObserver");
      __publicField(this, "disposed", false);
      __publicField(this, "themeObserver");
      __publicField(this, "frame", (now) => {
        const dt = Math.min(0.1, (now - this.last) / 1e3);
        this.last = now;
        this.acc += dt;
        let steps = 0;
        while (this.acc >= STEP && steps < MAX_STEPS) {
          this.world.step(STEP);
          this.acc -= STEP;
          steps++;
        }
        if (steps === MAX_STEPS) this.acc = 0;
        this.renderer.render(this.world, dt);
        this.raf = requestAnimationFrame(this.frame);
      });
      __publicField(this, "onThemeChange", () => {
        this.renderer.setTheme(document.documentElement.dataset.theme !== "dark");
        if (this.reducedMotion.matches) this.drawStill();
      });
      __publicField(this, "onMotionPreference", () => {
        if (this.reducedMotion.matches) {
          cancelAnimationFrame(this.raf);
          this.drawStill();
        } else {
          this.schedule();
        }
      });
      __publicField(this, "onPointerMove", (e) => {
        const { x, y, inside } = this.toLocal(e);
        const p = this.world.pointer;
        p.x = x;
        p.y = y;
        p.active = inside && e.pointerType !== "touch";
      });
      __publicField(this, "onWaterClick", (e) => {
        if (e.button !== 0) return;
        if (e.target instanceof Element && e.target.closest("a, button, input, select, textarea, [role='button'], .home-hero__avatar")) return;
        const { x, y, inside } = this.toLocal(e);
        if (inside && !this.reducedMotion.matches) this.world.splash(x, y);
      });
      __publicField(this, "onPointerLeave", () => {
        this.world.pointer.active = false;
      });
      this.world = new World(sharks);
      this.renderer = new AsciiRenderer(canvas2);
      this.renderer.setFontFamily(getComputedStyle(canvas2).fontFamily);
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.renderer.setTheme(document.documentElement.dataset.theme !== "dark");
      this.themeObserver = new MutationObserver(this.onThemeChange);
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas2);
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.schedule();
      });
      this.intersectionObserver.observe(canvas2);
      this.reducedMotion.addEventListener("change", this.onMotionPreference);
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("click", this.onWaterClick, { passive: true });
      document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
      window.addEventListener("blur", this.onPointerLeave);
      this.resize();
      document.fonts?.load(`600 16px ${getComputedStyle(canvas2).fontFamily}`).then(() => {
        if (!this.disposed && this.reducedMotion.matches) this.drawStill();
      });
      this.schedule();
    }
    destroy() {
      this.disposed = true;
      cancelAnimationFrame(this.raf);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.themeObserver.disconnect();
      this.reducedMotion.removeEventListener("change", this.onMotionPreference);
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("click", this.onWaterClick);
      document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
      window.removeEventListener("blur", this.onPointerLeave);
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.renderer.resize(rect.width, rect.height, dpr);
      this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
      if (this.reducedMotion.matches) this.drawStill();
    }
    schedule() {
      cancelAnimationFrame(this.raf);
      if (this.disposed || !this.visible || this.reducedMotion.matches) return;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
    /** Reduced motion: let the pond settle, then show a single frame. */
    drawStill() {
      if (this.world.time < 4) {
        for (let i = 0; i < 240; i++) this.world.step(STEP);
      }
      this.renderer.render(this.world, STEP);
    }
    toLocal(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      return { x, y, inside };
    }
  };

  // _animation/koi-pond/preview.ts
  var canvas = document.querySelector("#home-koi");
  if (canvas) {
    const engine = new OceanEngine(canvas);
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) engine.destroy();
    });
  }
})();
