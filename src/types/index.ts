export type WaterFlowMode = 'steady' | 'pulse' | 'random';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy';
export type WaterCondition = 'calm' | 'ripple' | 'rapid' | 'torrent';
export type WindCondition = 'calm' | 'breeze' | 'windy' | 'strong';
export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export type TimeOfDay = 'day' | 'dusk' | 'night';

export type LightingDeviceType = 'headlamp' | 'spotlight' | 'floodlight' | 'lantern';

export interface LightingDevice {
  id: string;
  name: string;
  type: LightingDeviceType;
  intensity: number;
  range: number;
  angle: number;
  x: number;
  y: number;
  color: string;
  powerConsumption: number;
}

export interface NightNavigationConfig {
  timeOfDay: TimeOfDay;
  lightingDevices: LightingDevice[];
  ambientLightLevel: number;
  obstacleDensity: number;
}

export interface NightVisibilityResult {
  overallVisibility: number;
  forwardVisibility: number;
  peripheralVisibility: number;
  effectiveRange: number;
  lightingCoverage: number;
  cargoShadowEffect: number;
}

export interface NightObstacleRisk {
  detectionProbability: number;
  reactionTimeAvailable: number;
  collisionRisk: 'low' | 'medium' | 'high' | 'critical';
  obstacleCount: number;
}

export interface NightNavigationReport {
  config: NightNavigationConfig;
  visibility: NightVisibilityResult;
  obstacleRisk: NightObstacleRisk;
  safetyScore: number;
  riskLevel: RiskLevel;
  canSailAtNight: boolean;
  warnings: WeatherWarning[];
  recommendations: WeatherRecommendation[];
  totalLightingIntensity: number;
  summary: string;
}

export interface WeatherWaterConfig {
  weather: WeatherCondition;
  water: WaterCondition;
  wind: WindCondition;
}

export interface WeatherWaterEffects {
  flowSpeedMultiplier: number;
  stabilityPenalty: number;
  waveHeight: number;
  visibility: number;
}

export interface WeatherWarning {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  riskLevel: RiskLevel;
}

export interface WeatherRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
}

export interface WeatherReport {
  config: WeatherWaterConfig;
  effects: WeatherWaterEffects;
  riskLevel: RiskLevel;
  canSail: boolean;
  warnings: WeatherWarning[];
  recommendations: WeatherRecommendation[];
  riskScore: number;
  summary: string;
}

export interface WeatherPreset {
  id: string;
  name: string;
  description: string;
  config: WeatherWaterConfig;
  riskLevel: RiskLevel;
  icon: string;
}

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
  weatherWater: WeatherWaterConfig;
  nightNavigation: NightNavigationConfig;
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
  weatherReport: WeatherReport;
  nightNavigationReport?: NightNavigationReport;
}

export interface RaftDimensions {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type RiverZoneType = 'calm' | 'ripple' | 'rapid' | 'torrent' | 'obstacle' | 'shallow' | 'narrows';

export type RoutePointType = 'start' | 'end' | 'waypoint';

export interface RiverZone {
  id: string;
  type: RiverZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  baseFlowSpeed: number;
  baseRiskScore: number;
}

export interface RoutePoint {
  id: string;
  x: number;
  y: number;
  type: RoutePointType;
  name: string;
}

export interface RouteSegment {
  fromPointId: string;
  toPointId: string;
  distance: number;
  flowSpeed: number;
  safetyScore: number;
  riskLevel: RiskLevel;
  estimatedTime: number;
  zoneTypes: RiverZoneType[];
  hazards: RouteHazard[];
}

export interface RouteHazard {
  id: string;
  type: 'rapid' | 'strong_wind' | 'low_visibility' | 'obstacle' | 'shallow' | 'narrows' | 'overload' | 'instability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  position: { x: number; y: number };
}

export interface RoutePlan {
  id: string;
  name: string;
  description: string;
  points: RoutePoint[];
  segments: RouteSegment[];
  totalDistance: number;
  totalEstimatedTime: number;
  overallSafetyScore: number;
  overallRiskLevel: RiskLevel;
  isNotRecommended: boolean;
  warnings: RouteHazard[];
  tags: string[];
}

export interface RoutePlanningInput {
  points: RoutePoint[];
  raftConfig: RaftConfig;
  buoyancy: BuoyancyResult;
  stability: StabilityResult;
  weatherReport: WeatherReport | null;
  nightNavigationReport: NightNavigationReport | null;
  riverZones: RiverZone[];
}

export interface RoutePlanningResult {
  routes: RoutePlan[];
  recommendedRouteIndex: number;
  riverZones: RiverZone[];
}
