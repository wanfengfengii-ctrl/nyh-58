export interface BambooTube {
  id: string;
  x: number;
  y: number;
  diameter: number;
  length: number;
  density: number;
}

export interface Cargo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  weight: number;
  color: string;
}

export interface RaftConfig {
  tubeCount: number;
  tubeDiameter: number;
  tubeLength: number;
  tubeSpacing: number;
  tubeDensity: number;
  waterDensity: number;
  waterFlowSpeed: number;
}

export interface CenterOfGravity {
  x: number;
  y: number;
  totalWeight: number;
}

export interface BuoyancyResult {
  totalBuoyancy: number;
  totalWeight: number;
  draftDepth: number;
  displacement: number;
  isOverloaded: boolean;
  loadRatio: number;
}

export interface StabilityResult {
  stabilityScore: number;
  tiltRisk: 'low' | 'medium' | 'high';
  leftRightBalance: number;
  frontBackBalance: number;
  cogX: number;
  cogY: number;
  centerX: number;
  centerY: number;
  leftWeight: number;
  rightWeight: number;
  isSailable: boolean;
}

export interface SavedScheme {
  id: string;
  name: string;
  createdAt: number;
  config: RaftConfig;
  cargos: Cargo[];
  buoyancy: BuoyancyResult;
  stability: StabilityResult;
}

export interface RaftDimensions {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}
