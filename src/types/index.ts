export type WaterFlowMode = 'steady' | 'pulse' | 'random';

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
  waterFlowMode: WaterFlowMode;
  pulseIntensity: number;
  pulseFrequency: number;
}

export interface PhysicsState {
  isRunning: boolean;
  raftAngle: number;
  raftAngularVelocity: number;
  raftVelocityX: number;
  raftVelocityY: number;
  waterLevel: number;
  dynamicDraftDepth: number;
  cargosPhysics: CargoPhysicsState[];
}

export interface CargoPhysicsState {
  cargoId: string;
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  isSlipping: boolean;
  slipDirection: 'left' | 'right' | null;
}

export interface SailingReason {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  value?: number;
  threshold?: number;
}

export interface SailingReport {
  canSail: boolean;
  score: number;
  reasons: SailingReason[];
  summary: string;
}

export interface LoadingSuggestion {
  id: string;
  type: 'balance' | 'weight' | 'position' | 'add' | 'remove';
  cargoId?: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImprovement: number;
}

export interface PlaybackFrame {
  timestamp: number;
  raft: {
    x: number;
    y: number;
    angle: number;
  };
  cargos: Array<{
    id: string;
    x: number;
    y: number;
    angle: number;
  }>;
  waterLevel: number;
}

export interface PlaybackState {
  isRecording: boolean;
  isPlaying: boolean;
  frames: PlaybackFrame[];
  currentFrameIndex: number;
  startTime: number;
  totalDuration: number;
  playbackSpeed: number;
}

export interface LocalStorageData {
  savedSchemes: SavedScheme[];
  playbackRecordings: Array<{
    id: string;
    name: string;
    createdAt: number;
    frames: PlaybackFrame[];
    config: RaftConfig;
    cargos: Cargo[];
  }>;
  settings: {
    waterFlowMode: WaterFlowMode;
    showWaterLine: boolean;
    showCenterOfGravity: boolean;
    autoSave: boolean;
  };
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
