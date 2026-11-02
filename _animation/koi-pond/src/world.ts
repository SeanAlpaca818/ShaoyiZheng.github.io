/** Calm koi swimming on a follow-the-leader spine around the hero copy. */
import { angleDiff, clamp, rand, TAU } from "./math";

export const SHARK_NODES = 20;
export type SharkKind = "kohaku" | "sanke" | "showa" | "tancho" | "ogon" | "shiro";
export type SharkSpec = { kind: SharkKind; size: number };

const DEFAULT_SHARKS: SharkSpec[] = [
  { kind: "kohaku", size: 1 },
  { kind: "sanke", size: 0.9 },
  { kind: "tancho", size: 0.82 },
  { kind: "ogon", size: 0.88 },
  { kind: "showa", size: 0.95 },
  { kind: "kohaku", size: 0.78 },
  { kind: "shiro", size: 0.76 },
  { kind: "tancho", size: 0.72 },
];

/** Kept for the renderer API; the pond has no background schools. */
export interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  species: number;
  alarm: number;
  alive: boolean;
  respawnAt: number;
  phase: number;
  turn: number;
  depth: number;
  millDir: 1 | -1;
}

export interface Shark {
  id: number;
  kind: SharkKind;
  length: number;
  /** Spine positions, rounded snout first: [x0, y0, x1, y1, ...]. */
  nodes: Float32Array;
  heading: number;
  speed: number;
  phase: number;
  turn: number;
  hunger: number;
  wander: number;
  orbitDir: 1 | -1;
  orbitRadius: number;
  target: Fish | null;
  retargetAt: number;
  depth: number;
}

export interface WorldEvent {
  kind: "eat" | "splash";
  x: number;
  y: number;
}

export class World {
  width = 0;
  height = 0;
  time = 0;
  fish: Fish[] = [];
  sharks: Shark[] = [];
  events: WorldEvent[] = [];
  pointer = { x: 0, y: 0, active: false };
  private destinations = new Map<number, { x: number; y: number }>();

  constructor(private sharkSpecs: SharkSpec[] = DEFAULT_SHARKS, _fishCount?: number) {}

  resize(width: number, height: number, _cellW: number, _cellH: number) {
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
      // Preserve position, heading and phase while restoring physical segment lengths.
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
      const a = (i / this.sharkSpecs.length) * TAU - 0.28 + Math.sin(i * 2.3) * 0.13;
      const orbitDir: 1 | -1 = i === 2 || i === 5 ? -1 : 1;
      const rx = W * (0.32 + 0.018 * Math.sin(i * 1.7));
      const ry = H * (0.30 + 0.025 * Math.cos(i * 1.3));
      const heading = Math.atan2(ry * Math.cos(a), -rx * Math.sin(a))
        + (orbitDir === -1 ? Math.PI : 0);
      // Place the body center on the circuit, so the whole fish starts in view.
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
        depth: 0.78 + size * 0.22,
      };
    });
    this.sharks.sort((a, b) => a.length - b.length);
  }

  splash(x: number, y: number) {
    this.events.push({ kind: "splash", x, y });
  }

  step(dt: number) {
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

      // A slow, continuous wandering offset keeps the circuit from feeling mechanical.
      const drift = Math.sin(time * 0.12 + sh.id * 1.9) * 0.16
        + Math.sin(time * 0.047 + sh.id) * 0.12;
      sh.wander += (drift - sh.wander) * Math.min(1, dt * 0.6);
      dx += Math.cos(sh.heading + sh.wander) * 0.3;
      dy += Math.sin(sh.heading + sh.wander) * 0.3;

      let destination = this.destinations.get(sh.id);
      if (!destination || time > sh.retargetAt
        || Math.hypot(destination.x - hx, destination.y - hy) < L * 0.55) {
        destination = this.chooseDestination(sh);
        this.destinations.set(sh.id, destination);
        sh.retargetAt = time + rand(16, 28);
      }
      const goalX = destination.x - hx;
      const goalY = destination.y - hy;
      const goalDistance = Math.hypot(goalX, goalY) || 1;
      dx += goalX / goalDistance * 1.65;
      dy += goalY / goalDistance * 1.65;

      // Compare the bodies' closest future approach, not only two snouts.
      // One response per neighbour avoids multiplying forces along a long flank.
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
          const side = opposing ? 1 : (-fy * awayX + fx * awayY >= 0 ? 1 : -1);
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

      // Look ahead before reaching the copy or pond edge, allowing broad calm turns.
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
        // The head and shoulders stay quiet; bending builds toward the tail.
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
  private chooseDestination(sh: Shark) {
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
          room = Math.min(room, Math.hypot(x - other.nodes[12], y - other.nodes[13])
            / ((sh.length + other.length) * 0.55));
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
}
