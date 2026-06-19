import type { RaftConfig, WaterFlowMode } from '../types';

const PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const A = PERM[X] + Y;
  const AA = PERM[A];
  const AB = PERM[A + 1];
  const B = PERM[X + 1] + Y;
  const BA = PERM[B];
  const BB = PERM[B + 1];
  return lerp(
    lerp(grad(PERM[AA], x, y), grad(PERM[BA], x - 1, y), u),
    lerp(grad(PERM[AB], x, y - 1), grad(PERM[BB], x - 1, y - 1), u),
    v
  );
}

export class WaterFlowSystem {
  private config: RaftConfig;

  constructor(config: RaftConfig) {
    this.config = config;
  }

  getFlowVelocity(time: number): { x: number; y: number } {
    const mode = this.config.waterFlowMode;
    const baseSpeed = this.config.waterFlowSpeed;

    switch (mode) {
      case 'steady':
        return { x: baseSpeed, y: 0 };
      case 'pulse': {
        const t = time * this.config.pulseFrequency;
        const factor = 1 + Math.sin(t) * this.config.pulseIntensity;
        return { x: baseSpeed * factor, y: 0 };
      }
      case 'random': {
        const scale = 0.5;
        const nx = perlin2(time * scale, 0);
        const ny = perlin2(time * scale, 100);
        const intensity = this.config.pulseIntensity;
        return {
          x: baseSpeed * (1 + nx * intensity),
          y: baseSpeed * ny * intensity * 0.5,
        };
      }
      default:
        return { x: baseSpeed, y: 0 };
    }
  }

  updateConfig(config: RaftConfig): void {
    this.config = config;
  }

  getMode(): WaterFlowMode {
    return this.config.waterFlowMode;
  }
}
