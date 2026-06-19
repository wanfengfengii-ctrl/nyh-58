import type { RaftConfig, RaftDimensions, BambooTube, Cargo } from '../types';

const GRAVITY = 9.81;

export function calculateRaftDimensions(config: RaftConfig): RaftDimensions {
  const { tubeCount, tubeDiameter, tubeLength, tubeSpacing } = config;
  
  const width = tubeCount * tubeDiameter + (tubeCount - 1) * tubeSpacing;
  const height = tubeLength;
  
  return {
    width,
    height,
    left: -width / 2,
    right: width / 2,
    top: -height / 2,
    bottom: height / 2,
  };
}

export function generateBambooTubes(config: RaftConfig): BambooTube[] {
  const { tubeCount, tubeDiameter, tubeLength, tubeDensity, tubeSpacing } = config;
  const dims = calculateRaftDimensions(config);
  const tubes: BambooTube[] = [];
  
  const startX = dims.left + tubeDiameter / 2;
  const step = tubeDiameter + tubeSpacing;
  
  for (let i = 0; i < tubeCount; i++) {
    tubes.push({
      id: `tube-${i}`,
      x: startX + i * step,
      y: 0,
      diameter: tubeDiameter,
      length: tubeLength,
      density: tubeDensity,
    });
  }
  
  return tubes;
}

export function calculateTubeVolume(tube: BambooTube): number {
  const radius = tube.diameter / 2;
  return Math.PI * radius * radius * tube.length;
}

export function calculateRaftVolume(config: RaftConfig): number {
  const tubes = generateBambooTubes(config);
  return tubes.reduce((sum, tube) => sum + calculateTubeVolume(tube), 0);
}

export function calculateRaftWeight(config: RaftConfig): number {
  const tubes = generateBambooTubes(config);
  return tubes.reduce((sum, tube) => {
    const volume = calculateTubeVolume(tube);
    return sum + volume * tube.density * GRAVITY;
  }, 0);
}

export function isCargoWithinBounds(
  cargoX: number,
  cargoY: number,
  cargoWidth: number,
  cargoHeight: number,
  config: RaftConfig
): boolean {
  const dims = calculateRaftDimensions(config);
  const halfW = cargoWidth / 2;
  const halfH = cargoHeight / 2;
  
  return (
    cargoX - halfW >= dims.left &&
    cargoX + halfW <= dims.right &&
    cargoY - halfH >= dims.top &&
    cargoY + halfH <= dims.bottom
  );
}

export function clampCargoToBounds(
  cargoX: number,
  cargoY: number,
  cargoWidth: number,
  cargoHeight: number,
  config: RaftConfig
): { x: number; y: number } {
  const dims = calculateRaftDimensions(config);
  const halfW = cargoWidth / 2;
  const halfH = cargoHeight / 2;
  
  let x = 0;
  let y = 0;
  
  if (cargoWidth >= dims.width) {
    x = 0;
  } else {
    x = Math.max(dims.left + halfW, Math.min(dims.right - halfW, cargoX));
  }
  
  if (cargoHeight >= dims.height) {
    y = 0;
  } else {
    y = Math.max(dims.top + halfH, Math.min(dims.bottom - halfH, cargoY));
  }
  
  return { x, y };
}

export function areAllCargosWithinBounds(
  cargos: Cargo[],
  config: RaftConfig
): boolean {
  return cargos.every((cargo) =>
    isCargoWithinBounds(cargo.x, cargo.y, cargo.width, cargo.height, config)
  );
}

export function clampAllCargosToBounds(
  cargos: Cargo[],
  config: RaftConfig
): Cargo[] {
  return cargos.map((cargo) => {
    const clamped = clampCargoToBounds(
      cargo.x,
      cargo.y,
      cargo.width,
      cargo.height,
      config
    );
    return { ...cargo, x: clamped.x, y: clamped.y };
  });
}

export function getOutOfBoundsCargos(
  cargos: Cargo[],
  config: RaftConfig
): string[] {
  return cargos
    .filter(
      (cargo) =>
        !isCargoWithinBounds(
          cargo.x,
          cargo.y,
          cargo.width,
          cargo.height,
          config
        )
    )
    .map((c) => c.name);
}
