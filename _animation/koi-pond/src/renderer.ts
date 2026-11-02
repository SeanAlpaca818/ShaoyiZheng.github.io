/**
 * Draws the World as a grid of ASCII cells:
 * Jade water, subdued wakes, and koi rasterised with the upstream ASCII grid.
 * Body-space pigment islands follow the swimming spine. No rainbow shimmer.
 * Adapted from stackedlol/ascii-sharks (MIT); see the accompanying license.
 */
import { clamp, hash3, smoothstep } from "./math";
import { SHARK_NODES, type Shark, type SharkKind, type World } from "./world";

const ALPHA_LEVELS = 6;
const FISH_ALPHAS = [0.28, 0.42, 0.58, 0.74, 0.9];

// Dot colour classes: blue, green, red, pale; the last entry is the cyan wake.
const DOT_RGB: [number, number, number][] = [
  [48, 52, 235],
  [52, 205, 60],
  [228, 50, 44],
  [190, 212, 255],
  [110, 230, 255],
];
const DOT_BASE_ALPHA = [1, 1, 1, 1, 1];
const WAKE = DOT_RGB.length - 1;


// Sparse glyphs on bright skin, dense glyphs in shadow, so the texture
// reinforces the shading instead of fighting it.


const FLAG_BODY = 1;
const FLAG_EDGE = 2;
const FLAG_FIN = 3;
const FLAG_RIDGE = 4;
const FLAG_EYE = 5;


// Sub-cell sample offsets for anti-aliased silhouettes.
const SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];

/** Full shoulders, a rounded snout, and a sturdy caudal peduncle. */
function koiHalfWidth(s: number) {
  if (s < 0.04) return 0.034 + 0.033 * smoothstep(0, 0.04, s);
  if (s < 0.22) return 0.067 + 0.045 * smoothstep(0.04, 0.22, s);
  if (s < 0.36) return 0.112 + 0.008 * Math.sin((s - 0.22) / 0.14 * Math.PI);
  if (s < 0.8) return 0.021 + 0.091 * Math.pow(1 - (s - 0.36) / 0.44, 1.05);
  if (s < 0.86) return 0.021 - 0.006 * smoothstep(0.8, 0.86, s);
  return 0;
}

interface SharkShape {
  halfWidth: (s: number) => number;
  pectoral: [number, number, number, number];
  tint: [number, number, number];
}
const KOI_SHAPE: SharkShape = {
  halfWidth: koiHalfWidth,
  pectoral: [0.19, 0.43, 0.34, 0.195],
  tint: [1, 1, 1],
};
const SHAPES: Record<SharkKind, SharkShape> = {
  kohaku: KOI_SHAPE, sanke: KOI_SHAPE, showa: KOI_SHAPE,
  tancho: KOI_SHAPE, ogon: KOI_SHAPE, shiro: KOI_SHAPE,
};
// Ivory, vermilion, sumi ink, and Yamabuki gold. Stable body-space markings.
const KOI_COLORS = [[239, 232, 210], [220, 65, 37], [34, 44, 40], [230, 177, 64]];

const KINDS = Object.keys(SHAPES) as SharkKind[];

/** Visible dark-grey cell grid, snapped to device pixels. Shared with the sidebar backdrop. */
export function paintGrid(g: CanvasRenderingContext2D, W: number, H: number, cw: number, ch: number, dpr: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = "rgba(255,255,255,0.055)";
  g.lineWidth = 1;
  g.beginPath();
  for (let c = 0; c <= Math.ceil(W / cw); c++) {
    const x = Math.round(c * cw * dpr) + 0.5;
    g.moveTo(x, 0);
    g.lineTo(x, H * dpr);
  }
  for (let r = 0; r <= Math.ceil(H / ch); r++) {
    const y = Math.round(r * ch * dpr) + 0.5;
    g.moveTo(0, y);
    g.lineTo(W * dpr, y);
  }
  g.stroke();
}

export class AsciiRenderer {
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private cw = 12;
  private ch = 18;
  private cols = 0;
  private rows = 0;
  private fontFamily = "ui-monospace, Menlo, monospace";

  private dotKind = new Uint8Array(0); // 0 none, 1 blue, 2 green, 3 red, 4 pale
  private dotPhase = new Float32Array(0);
  private dotFreq = new Float32Array(0);
  private energy = new Float32Array(0);
  private energyTmp = new Float32Array(0);
  private heat = new Float32Array(0);
  private bucketOf = new Uint8Array(0);
  private bucketOrder = new Int32Array(0);
  private bucketCounts = new Int32Array(DOT_RGB.length * ALPHA_LEVELS + 1);
  private dotStyles: string[] = [];

  private sharkFlag = new Uint8Array(0);
  private sharkShade = new Float32Array(0);
  private sharkKey = new Uint32Array(0);
  private sharkDepth = new Float32Array(0);
  private sharkKind = new Uint8Array(0);
  /** Cells darkened by a shark's shadow on the seabed. */
  private sharkShadow = new Uint8Array(0);
  private spine = new Float32Array(SHARK_NODES * 2);
  private arc = new Float32Array(SHARK_NODES);
  private arcTotal = 1;
  private shape = SHAPES.kohaku;
  private currentKind: SharkKind = "kohaku";
  private light = false;
  private material = new Uint8Array(0);
  private ripples: { x: number; y: number; born: number; life: number; speed: number; strength: number }[] = [];
  private sharkId = 0;
  private finTipLeft = 0;
  private finTipRight = 0;
  // Scratch outputs of sampleShark(), to avoid allocating per sample.
  private hitFlag = 0;
  private hitShade = 0;
  private hitS = 0;
  private hitV = 0;
  private hitDist = 0;

  /** Cells holding a fish this frame (frame stamp); dots skip them. */
  private fishStamp = new Uint32Array(0);
  private frameId = 0;
  /** Fish cells bucketed by brightness, so each bucket is one fillStyle. */
  private fishBuckets: number[][] = FISH_ALPHAS.map(() => []);
  private fishStyles = FISH_ALPHAS.map((a) => `rgba(230,238,255,${a})`);

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.bg = document.createElement("canvas");

    for (let c = 0; c < DOT_RGB.length; c++) {
      const [r, g, b] = DOT_RGB[c];
      for (let l = 0; l < ALPHA_LEVELS; l++) {
        const a = (DOT_BASE_ALPHA[c] * (l + 1)) / ALPHA_LEVELS;
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

  setFontFamily(family: string) {
    if (family) this.fontFamily = family;
  }

  resize(width: number, height: number, dpr: number) {
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
      const row = (i / this.cols) | 0;
      // Keep open water quiet; only the wake activates these cells.
      this.dotKind[i] = 0;
      this.dotPhase[i] = hash3(col, row, 23) * Math.PI * 2;
      this.dotFreq[i] = 0.3 + hash3(col, row, 37) * 1.1;
    }
    this.paintBackground();
  }

  setTheme(light: boolean) {
    this.light = light;
    this.dotStyles = [];
    for (let c = 0; c < DOT_RGB.length; c++) {
      for (let l = 0; l < ALPHA_LEVELS; l++) {
        const alpha = (l + 1) / ALPHA_LEVELS * (light ? 0.28 : 0.20);
        this.dotStyles.push(light ? `rgba(63,115,95,${alpha})` : `rgba(73,80,74,${alpha})`);
      }
    }
    this.paintBackground();
  }

  private paintBackground() {
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
      // Broad, asymmetrical ink blooms; cached once, like diluted ink on paper.
      const bloom = (x: number, y: number, rx: number, ry: number, alpha: number) => {
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
    // The ink-paper variant has no graph-paper grid; the fish retain ASCII texture.
    g.strokeStyle = this.light ? "rgba(45,80,60,0.025)" : "rgba(79,83,74,0.006)";
    g.lineWidth = 0.6;
    g.beginPath();
    for (let x = 0; x < W; x += cw) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y < H; y += ch) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  }

  private drawWater(t: number) {
    const { ctx, cols, rows, cw, ch } = this;
    ctx.font = `400 ${Math.round(ch * 0.72)}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.ripples = this.ripples.filter(r => t - r.born < r.life);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (this.sharkFlag[i]) continue;
        const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
        const wave = Math.sin(c * 0.105 + r * 0.14 + t * 0.17)
          + Math.sin(c * -0.08 + r * 0.19 - t * 0.13);
        let a = wave > 1.93 ? 0.075 : 0;
        if (!a || hash3(c, r, 71) < 0.3) continue;
        ctx.fillStyle = this.light ? `rgba(56,96,74,${a})` : `rgba(73,80,74,${a})`;
        ctx.fillText("·", x, y);
      }
    }
    ctx.fillStyle = this.light ? "rgba(39,70,50,0.06)" : "rgba(48,54,48,0.05)";
    for (let i = 0; i < this.sharkShadow.length; i++) {
      if (this.sharkShadow[i] && !this.sharkFlag[i])
        ctx.fillRect((i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    }
  }

  render(world: World, dt: number) {
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

  private drawRipples(t: number) {
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

  private cellIndex(x: number, y: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  private stamp(field: Float32Array, x: number, y: number, radius: number, amount: number) {
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

  private consumeEvents(world: World) {
    for (const e of world.events) {
      if (e.kind !== "splash") continue;
      this.ripples.push({ x: e.x, y: e.y, born: world.time, life: 5.2, speed: 72, strength: 0.62 });
      this.ripples.push({ x: e.x, y: e.y, born: world.time + 0.35, life: 4.6, speed: 64, strength: 0.34 });
      if (this.ripples.length > 12) this.ripples.splice(0, this.ripples.length - 12);
    }
    world.events.length = 0;
  }

  private depositWake(world: World) {
    const { energy } = this;
    for (const f of world.fish) {
      if (!f.alive) continue;
      const i = this.cellIndex(f.x, f.y);
      if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.012 + f.alarm * 0.03);
    }
    for (const sh of world.sharks) {
      // The tail sweeps the most water.
      for (let k = SHARK_NODES - 6; k < SHARK_NODES; k++) {
        const i = this.cellIndex(sh.nodes[k * 2], sh.nodes[k * 2 + 1]);
        if (i >= 0) energy[i] = Math.min(1.6, energy[i] + 0.035 + sh.speed * 0.0008);
      }
    }
    if (world.pointer.active) {
      this.stamp(energy, world.pointer.x, world.pointer.y, 1, 0.08);
    }
  }

  /** Blur + decay so wakes spread out like ripples and fade. */
  private diffuse(dt: number) {
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
  private sampleShark(px: number, py: number, L: number) {
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
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u;
      const qy = ay + sy * u;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);
        bestS = (arc[k] + u * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
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
        // A low dorsal fold: no triangular shark fin and no bright white stripe.
        this.hitFlag = FLAG_RIDGE;
        this.hitShade += 0.04;
      } else if (s > 0.19 && s < 0.205 && across > 0.58) {
        this.hitShade *= 0.85; // one curved operculum, not shark gill slits
      }
      return true;
    }

    // Rounded, gently swept pectoral fans. Their roots disappear into the shoulder.
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
    // Small pelvic fins, set close to the body.
    if (((s - 0.65 - av * 0.22) / 0.065) ** 2 + ((av - 0.052) / 0.039) ** 2 < 1) {
      this.hitFlag = FLAG_FIN;
      this.hitShade = 0.42;
      return true;
    }
    // Symmetric, shallow-forked caudal fan; strong short stalk, soft outer lobes.
    if (s >= 0.79 && s < 0.998) {
      const k = (s - 0.79) / 0.208;
      const outer = 0.017 + 0.115 * Math.pow(k, 0.8);
      const notch = k > 0.62 ? 0.09 * Math.pow((k - 0.62) / 0.38, 0.8) : 0;
      const rounded = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, k - 0.86) / 0.14, 2))) * 0.035;
      if (av < Math.min(outer, 0.10 + rounded) && av > notch) {
        this.hitFlag = FLAG_FIN;
        this.hitShade = 0.40 + 0.12 * Math.cos(av / (0.03 + k * 0.10) * 26);
        return true;
      }
    }
    return false;
  }

  /** Large, asymmetric pigment islands, anchored to skin rather than screen pixels. */
  private pigment(s: number, v: number) {
    const kind = this.currentKind;
    if (kind === "ogon") return 3;
    const variant = this.sharkId === 6;
    const wobble = Math.sin(s * 43 + v * 37 + this.sharkId) * 0.007
      + Math.sin(s * 87 - v * 25) * 0.003;
    const patch = (cx: number, cy: number, rx: number, ry: number) =>
      ((s - cx + wobble) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1;
    if (kind === "tancho") return patch(0.135, 0, 0.06, 0.057) ? 1 : 0;
    if (kind === "shiro") {
      return patch(0.11, -0.035, 0.10, 0.075) || patch(0.35, 0.045, 0.12, 0.13)
        || patch(0.62, -0.025, 0.12, 0.095) ? 2 : 0;
    }
    const red = patch(0.12, 0.008, 0.105, 0.065)
      || patch(variant ? 0.34 : 0.36, variant ? -0.04 : 0.026, variant ? 0.18 : 0.115, 0.125)
      || patch(variant ? 0.59 : 0.65, -0.022, variant ? 0.10 : 0.08, 0.09);
    if (kind === "showa") {
      const ink = patch(0.15, -0.05, 0.105, 0.04) || patch(0.44, 0.055, 0.09, 0.14)
        || patch(0.73, -0.02, 0.075, 0.09);
      if (ink) return 2;
    }
    if (kind === "sanke" && s > 0.23) {
      const ink = patch(0.285, -0.05, 0.042, 0.035)
        || patch(0.51, 0.035, 0.04, 0.032) || patch(0.71, -0.018, 0.027, 0.033);
      if (ink) return 2;
    }
    return red ? 1 : 0;
  }

  /**
   * Build a smooth, undulating render spine from the sim spine, then
   * supersample every cell in the shark's bounding box against the shape.
   * Fully covered cells become solid skin; partial cells become edge glyphs.
   */
  private rasterizeSharks(sharks: Shark[], t: number) {
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

      // Travelling body wave, growing toward the tail.
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
        arc[k] =
          arc[k - 1] +
          Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
      }
      this.arcTotal = arc[N - 1] || 1;

      // Bank into turns: the inside fin foreshortens, the outside one spreads.
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
      const shadowDc = Math.round((L * 0.035) / cw) + 1;
      const shadowDr = Math.round((L * 0.02) / ch) + 1;

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
          // Body-anchored key so each glyph rides along with the skin.
          const key = (hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), sh.id) * 4294967295) >>> 0;
          sharkKey[i] = key;
          sharkDepth[i] = sh.depth;
          sharkKind[i] = kindIndex;
          this.material[i] = flag === FLAG_FIN ? (sh.kind === "ogon" ? 3 : 0) : this.pigment(s, v / L);

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

  private drawSharks(_t: number) {
    const { ctx, cols, rows, cw, ch, sharkFlag, sharkShade, sharkKey, sharkDepth } = this;
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const flag = sharkFlag[i];
      if (!flag) continue;
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      const key = sharkKey[i], shade = sharkShade[i];
      const pigment = this.material[i];
      const color = KOI_COLORS[pigment];
      const dim = 0.84 + 0.16 * sharkDepth[i];
      const light = (0.66 + shade * 0.37) * dim;
      const rgb = color.map(c => Math.round(c * light));
      if (flag === FLAG_EDGE) {
        ctx.globalAlpha = 0.36 + shade * 0.5;
        ctx.fillStyle = `rgb(${rgb.join(",")})`;
        ctx.fillText(shade > 0.4 ? ":" : ".", x + cw / 2, y + ch / 2 + 1);
        ctx.globalAlpha = 1;
        continue;
      }
      const fin = flag === FLAG_FIN;
      ctx.globalAlpha = fin ? 0.38 + shade * 0.30 : 1;
      ctx.fillStyle = flag === FLAG_EYE ? "#25332c" : `rgb(${rgb.join(",")})`;
      ctx.fillRect(x + 0.65, y + 0.65, cw - 0.65, ch - 0.65);
      ctx.globalAlpha = 1;
      const glyphs = fin ? "/:;" : (pigment === 2 ? ":;x%" : ":;=x%S");
      const glyph = flag === FLAG_EYE ? "·" : glyphs[(key >>> 8) % glyphs.length];
      // Restrained scale texture; the color islands remain the dominant signal.
      ctx.fillStyle = flag === FLAG_EYE ? "rgba(224,218,190,0.55)"
        : pigment === 2 ? "rgba(150,163,135,0.32)"
        : fin ? (this.light ? "rgba(54,82,58,0.24)" : "rgba(73,80,74,0.22)")
        : `rgba(36,48,35,${0.42 + (1 - shade) * 0.13})`;
      ctx.fillText(glyph, x + cw / 2, y + ch / 2 + 1);
    }
  }

  // ── fish, dots, heat ────────────────────────────────────────────────

  /**
   * Snap each fish to a cell and bucket it by brightness: far fish are dim,
   * near fish brighter, and turning or panicking fish glint. Nearer fish
   * claim a cell first when two land in the same one.
   */
  private markFish(world: World) {
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
        const v = 0.3 + (0.4 * (f.depth - 0.55)) / 0.45 + 0.3 * Math.max(glint, f.alarm);
        fishBuckets[clamp(Math.floor(v * FISH_ALPHAS.length), 0, FISH_ALPHAS.length - 1)].push(i);
      }
    }
  }

  private drawFish() {
    const { ctx, cw, ch, cols, fishBuckets } = this;
    for (let b = 0; b < fishBuckets.length; b++) {
      const bucket = fishBuckets[b];
      if (!bucket.length) continue;
      ctx.fillStyle = this.fishStyles[b];
      for (const i of bucket) {
        ctx.fillText("-", (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2 + 1);
      }
    }
  }

  private drawHeat() {
    const { ctx, heat, cols, cw, ch } = this;
    for (let i = 0; i < heat.length; i++) {
      const h = heat[i];
      if (h < 0.08) continue;
      const col = i % cols;
      const row = (i / cols) | 0;
      ctx.fillStyle = h > 0.5 ? `rgba(255,120,60,${h.toFixed(2)})` : `rgba(220,40,40,${(h * 1.6).toFixed(2)})`;
      ctx.fillText(h > 0.6 ? "*" : "·", col * cw + cw / 2, row * ch + ch / 2 + 1);
    }
  }

  /**
   * Every cell's dot twinkles on its own clock, is modulated by slow
   * caustic light bands, and flares cyan where the wake field is strong.
   * Dots are bucketed by colour/alpha so each bucket is one fillStyle.
   */
  private drawDots(t: number) {
    const { ctx, cols, rows, cw, ch, dotKind, dotPhase, dotFreq, energy, sharkFlag, sharkShadow, fishStamp, frameId } = this;
    const { bucketOf, bucketOrder, bucketCounts } = this;
    const n = cols * rows;
    const SKIP = bucketCounts.length - 1;
    bucketCounts.fill(0);

    for (let i = 0; i < n; i++) {
      const e = energy[i];
      const kind = dotKind[i];
      if (sharkFlag[i] || fishStamp[i] === frameId || (kind === 0 && e < 0.45)) {
        bucketOf[i] = SKIP;
        continue;
      }
      let bucket: number;
      if (e > 0.45) {
        const level = clamp(Math.floor((e - 0.45) * 5), 0, ALPHA_LEVELS - 1);
        bucket = WAKE * ALPHA_LEVELS + level;
      } else {
        const col = i % cols;
        const row = (i / cols) | 0;
        // Dots stay bright and crisp; the twinkle is a gentle breathe, not a fade.
        const twinkle = 0.5 + 0.5 * Math.sin(t * dotFreq[i] + dotPhase[i]);
        const caustic = 0.85 + 0.15 * Math.sin(col * 0.11 + t * 0.35) * Math.sin(row * 0.17 - t * 0.27);
        let v = clamp((0.55 + 0.45 * twinkle) * caustic + e * 2, 0, 1);
        if (sharkShadow[i]) v *= 0.2;
        bucket = (kind - 1) * ALPHA_LEVELS + clamp(Math.floor(v * ALPHA_LEVELS), 0, ALPHA_LEVELS - 1);
      }
      bucketOf[i] = bucket;
      bucketCounts[bucket]++;
    }

    // Counting sort cells by bucket.
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
        const row = (i / cols) | 0;
        // Sit the dot low-right in its cell, as in the reference.
        ctx.fillRect(Math.round(col * cw + cw * 0.66 - size / 2), Math.round(row * ch + ch * 0.64 - size / 2), size, size);
      }
    }
  }
}
