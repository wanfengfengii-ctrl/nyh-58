import type { RaftConfig, Cargo, WeatherPreset, WeatherWaterConfig, NightNavigationConfig, LightingDevice, TimeOfDay, LightingDeviceType, RiverZone, RiverZoneType } from '../types';

export const DEFAULT_WEATHER_CONFIG: WeatherWaterConfig = {
  weather: 'sunny',
  water: 'calm',
  wind: 'calm',
};

export const DEFAULT_NIGHT_CONFIG: NightNavigationConfig = {
  timeOfDay: 'day',
  lightingDevices: [],
  ambientLightLevel: 0.5,
  obstacleDensity: 0.3,
};

export const DEFAULT_CONFIG: RaftConfig = {
  tubeCount: 8,
  tubeDiameter: 0.15,
  tubeLength: 6,
  tubeSpacing: 0.05,
  tubeDensity: 350,
  waterDensity: 1000,
  waterFlowSpeed: 1.5,
  waterFlowMode: 'steady',
  pulseIntensity: 2,
  pulseFrequency: 0.5,
  weatherWater: DEFAULT_WEATHER_CONFIG,
  nightNavigation: DEFAULT_NIGHT_CONFIG,
};

export const STORAGE_KEYS = {
  SAVED_SCHEMES: 'raft_simulator_schemes',
  PLAYBACKS: 'raft_simulator_playbacks',
  SETTINGS: 'raft_simulator_settings',
} as const;

export const PHYSICS_CONSTANTS = {
  GRAVITY: 9.81,
  WATER_DRAG_COEFFICIENT: 0.47,
  RAFT_DRAG_COEFFICIENT: 1.1,
  CARGO_FRICTION_COEFFICIENT: 0.6,
  ANGULAR_DAMPING: 0.95,
  LINEAR_DAMPING: 0.9,
  MAX_ANGLE: Math.PI / 6,
  BUOYANCY_DAMPING: 0.98,
} as const;

export const DEFAULT_CARGOS: Cargo[] = [
  {
    id: 'cargo-1',
    name: '货物A',
    x: -0.5,
    y: -1,
    width: 0.8,
    height: 1,
    weight: 500,
    color: '#3498db',
  },
  {
    id: 'cargo-2',
    name: '货物B',
    x: 0.5,
    y: 0.5,
    width: 0.8,
    height: 1,
    weight: 400,
    color: '#e74c3c',
  },
];

export const CARGO_COLORS = [
  '#3498db',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
];

export function generateCargoId(): string {
  return `cargo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'preset-sunny-calm',
    name: '晴天静水',
    description: '阳光明媚，水面平静，最适合出航',
    config: { weather: 'sunny', water: 'calm', wind: 'calm' },
    riskLevel: 'safe',
    icon: '☀️',
  },
  {
    id: 'preset-cloudy-breeze',
    name: '阴天微风',
    description: '多云天气，有轻微风浪，航行舒适',
    config: { weather: 'cloudy', water: 'ripple', wind: 'breeze' },
    riskLevel: 'safe',
    icon: '⛅',
  },
  {
    id: 'preset-rainy-ripple',
    name: '小雨微浪',
    description: '有小雨和微波浪，需谨慎驾驶',
    config: { weather: 'rainy', water: 'ripple', wind: 'breeze' },
    riskLevel: 'caution',
    icon: '🌧️',
  },
  {
    id: 'preset-windy-rapid',
    name: '大风急流',
    description: '风力较大，水流湍急，稳定性下降',
    config: { weather: 'cloudy', water: 'rapid', wind: 'windy' },
    riskLevel: 'warning',
    icon: '💨',
  },
  {
    id: 'preset-stormy-torrent',
    name: '暴风雨洪峰',
    description: '暴风雨天气，水流汹涌，禁止出航',
    config: { weather: 'stormy', water: 'torrent', wind: 'strong' },
    riskLevel: 'danger',
    icon: '⛈️',
  },
];

export const WEATHER_LABELS: Record<string, string> = {
  sunny: '晴天',
  cloudy: '阴天',
  rainy: '下雨',
  stormy: '暴风雨',
  calm: '平静',
  ripple: '微波',
  rapid: '急流',
  torrent: '洪峰',
  breeze: '微风',
  windy: '大风',
  strong: '强风',
};

export const RISK_LABELS: Record<string, string> = {
  safe: '安全',
  caution: '注意',
  warning: '警告',
  danger: '危险',
};

export const RISK_COLORS: Record<string, string> = {
  safe: 'green',
  caution: 'blue',
  warning: 'yellow',
  danger: 'red',
};

export const RISK_BG_COLORS: Record<string, string> = {
  safe: '#ebfbee',
  caution: '#e7f5ff',
  warning: '#fff9db',
  danger: '#fff5f5',
};

export const RISK_BORDER_COLORS: Record<string, string> = {
  safe: '#40c057',
  caution: '#228be6',
  warning: '#fab005',
  danger: '#fa5252',
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  day: '白天',
  dusk: '黄昏',
  night: '夜晚',
};

export const TIME_OF_DAY_ICONS: Record<TimeOfDay, string> = {
  day: '☀️',
  dusk: '🌅',
  night: '🌙',
};

export const LIGHTING_DEVICE_LABELS: Record<LightingDeviceType, string> = {
  headlamp: '头灯',
  spotlight: '探照灯',
  floodlight: '泛光灯',
  lantern: '灯笼',
};

export const LIGHTING_DEVICE_COLORS: Record<LightingDeviceType, string> = {
  headlamp: '#ffd43b',
  spotlight: '#ff922b',
  floodlight: '#fcc419',
  lantern: '#ff6b6b',
};

export const DEFAULT_LIGHTING_DEVICES: LightingDevice[] = [
  {
    id: 'light-spotlight-front',
    name: '前置探照灯',
    type: 'spotlight',
    intensity: 1.0,
    range: 50,
    angle: 25,
    x: 0,
    y: -2.5,
    color: '#ff922b',
    powerConsumption: 50,
  },
  {
    id: 'light-lantern-left',
    name: '左舷灯笼',
    type: 'lantern',
    intensity: 0.8,
    range: 8,
    angle: 360,
    x: -1,
    y: 0,
    color: '#ff6b6b',
    powerConsumption: 10,
  },
  {
    id: 'light-lantern-right',
    name: '右舷灯笼',
    type: 'lantern',
    intensity: 0.8,
    range: 8,
    angle: 360,
    x: 1,
    y: 0,
    color: '#ff6b6b',
    powerConsumption: 10,
  },
];

export function generateLightingDeviceId(): string {
  return `light-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRoutePointId(): string {
  return `rp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const RIVER_ZONE_LABELS: Record<RiverZoneType, string> = {
  calm: '静水区',
  ripple: '微波区',
  rapid: '急流区',
  torrent: '洪峰区',
  obstacle: '障碍区',
  shallow: '浅滩区',
  narrows: '狭窄航道',
};

export const RIVER_ZONE_COLORS: Record<RiverZoneType, string> = {
  calm: '#69db7c',
  ripple: '#74c0fc',
  rapid: '#ffa94d',
  torrent: '#ff6b6b',
  obstacle: '#868e96',
  shallow: '#ffd43b',
  narrows: '#da77f2',
};

export const RIVER_ZONE_RISK_SCORES: Record<RiverZoneType, number> = {
  calm: 95,
  ripple: 80,
  rapid: 45,
  torrent: 15,
  obstacle: 20,
  shallow: 55,
  narrows: 50,
};

export const RIVER_ZONE_FLOW_SPEEDS: Record<RiverZoneType, number> = {
  calm: 1.0,
  ripple: 2.0,
  rapid: 5.0,
  torrent: 9.0,
  obstacle: 1.5,
  shallow: 0.5,
  narrows: 4.0,
};

export const DEFAULT_RIVER_ZONES: RiverZone[] = [
  { id: 'zone-1', type: 'calm', x: 0, y: 0, width: 200, height: 400, name: '出发港静水区', baseFlowSpeed: 1.0, baseRiskScore: 95 },
  { id: 'zone-2', type: 'ripple', x: 0, y: 400, width: 200, height: 200, name: '碧波过渡区', baseFlowSpeed: 2.0, baseRiskScore: 80 },
  { id: 'zone-3', type: 'rapid', x: 0, y: 600, width: 200, height: 250, name: '虎跳峡急流', baseFlowSpeed: 5.0, baseRiskScore: 45 },
  { id: 'zone-4', type: 'calm', x: 0, y: 850, width: 200, height: 300, name: '月牙湾静水', baseFlowSpeed: 1.0, baseRiskScore: 95 },
  { id: 'zone-5', type: 'narrows', x: 0, y: 1150, width: 200, height: 200, name: '龙门峡窄道', baseFlowSpeed: 4.0, baseRiskScore: 50 },
  { id: 'zone-6', type: 'shallow', x: 0, y: 1350, width: 200, height: 200, name: '金沙浅滩', baseFlowSpeed: 0.5, baseRiskScore: 55 },
  { id: 'zone-7', type: 'torrent', x: 0, y: 1550, width: 200, height: 250, name: '怒涛洪峰段', baseFlowSpeed: 9.0, baseRiskScore: 15 },
  { id: 'zone-8', type: 'obstacle', x: 0, y: 1800, width: 200, height: 200, name: '暗礁密布区', baseFlowSpeed: 1.5, baseRiskScore: 20 },
  { id: 'zone-9', type: 'ripple', x: 0, y: 2000, width: 200, height: 200, name: '翠谷微波段', baseFlowSpeed: 2.0, baseRiskScore: 80 },
  { id: 'zone-10', type: 'calm', x: 0, y: 2200, width: 200, height: 300, name: '终点港静水区', baseFlowSpeed: 1.0, baseRiskScore: 95 },
];

export const ROUTE_PLAN_TAGS = {
  fastest: '最快路线',
  safest: '最安全路线',
  balanced: '均衡路线',
  notRecommended: '不建议出航',
};

export const RIVER_MAP_WIDTH = 200;
export const RIVER_MAP_HEIGHT = 2500;
export const RIVER_MAP_SCALE = 0.25;
