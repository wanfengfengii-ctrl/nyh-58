import type {
  NightNavigationConfig,
  NightVisibilityResult,
  NightObstacleRisk,
  NightNavigationReport,
  LightingDevice,
  Cargo,
  RaftConfig,
  WeatherReport,
  RiskLevel,
  WeatherWarning,
  WeatherRecommendation,
} from '../types';
import { calculateRaftDimensions } from './raftGeometry';
import { RISK_LABELS } from '../constants';

const TIME_OF_DAY_LIGHT: Record<string, number> = {
  day: 1.0,
  dusk: 0.35,
  night: 0.05,
};

const TIME_OF_DAY_LABELS: Record<string, string> = {
  day: '白天',
  dusk: '黄昏',
  night: '夜晚',
};

const LIGHTING_DEVICE_INTENSITY: Record<string, number> = {
  headlamp: 30,
  spotlight: 80,
  floodlight: 120,
  lantern: 20,
};

const LIGHTING_DEVICE_RANGE: Record<string, number> = {
  headlamp: 15,
  spotlight: 50,
  floodlight: 30,
  lantern: 8,
};

const LIGHTING_DEVICE_ANGLE: Record<string, number> = {
  headlamp: 60,
  spotlight: 25,
  floodlight: 120,
  lantern: 360,
};

function calculateTotalLightingIntensity(devices: LightingDevice[]): number {
  return devices.reduce((sum, device) => {
    const baseIntensity = LIGHTING_DEVICE_INTENSITY[device.type] || device.intensity;
    return sum + baseIntensity * device.intensity;
  }, 0);
}

function calculateCargoShadowEffect(
  cargos: Cargo[],
  devices: LightingDevice[],
  config: RaftConfig
): number {
  if (cargos.length === 0 || devices.length === 0) return 0;

  const dims = calculateRaftDimensions(config);
  let totalBlockedArea = 0;
  let totalLightArea = 0;

  devices.forEach((device) => {
    const deviceRange = LIGHTING_DEVICE_RANGE[device.type] || device.range;
    const deviceAngle = LIGHTING_DEVICE_ANGLE[device.type] || device.angle;
    
    const lightArea = Math.PI * deviceRange * deviceRange * (deviceAngle / 360);
    totalLightArea += lightArea;

    cargos.forEach((cargo) => {
      const dx = cargo.x - device.x;
      const dy = cargo.y - device.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < deviceRange) {
        const cargoArea = cargo.width * cargo.height;
        const shadowFactor = 1 - distance / deviceRange;
        totalBlockedArea += cargoArea * shadowFactor * 0.5;
      }
    });
  });

  if (totalLightArea === 0) return 0;
  return Math.min(0.6, totalBlockedArea / (dims.width * dims.height) * 0.3);
}

export function calculateNightVisibility(
  nightConfig: NightNavigationConfig,
  cargos: Cargo[],
  config: RaftConfig,
  weatherReport?: WeatherReport
): NightVisibilityResult {
  const { timeOfDay, lightingDevices, ambientLightLevel } = nightConfig;
  
  const baseLight = TIME_OF_DAY_LIGHT[timeOfDay];
  const weatherVisibilityFactor = weatherReport?.effects.visibility ?? 1.0;
  const totalLightingIntensity = calculateTotalLightingIntensity(lightingDevices);
  
  const lightingContribution = Math.min(0.8, totalLightingIntensity / 200);
  const ambientContribution = ambientLightLevel * 0.1;
  
  let overallVisibility = baseLight * weatherVisibilityFactor + lightingContribution + ambientContribution;
  overallVisibility = Math.min(1.0, Math.max(0.02, overallVisibility));
  
  const cargoShadowEffect = calculateCargoShadowEffect(cargos, lightingDevices, config);
  overallVisibility = Math.max(0.01, overallVisibility - cargoShadowEffect);
  
  const forwardVisibility = Math.min(1.0, overallVisibility * 1.1);
  
  const sideLightCoverage = lightingDevices.filter(d => {
    const angle = LIGHTING_DEVICE_ANGLE[d.type] || d.angle;
    return angle > 100;
  }).length > 0;
  const peripheralVisibility = overallVisibility * (sideLightCoverage ? 0.85 : 0.5);
  
  let effectiveRange: number;
  if (overallVisibility > 0.8) effectiveRange = 100;
  else if (overallVisibility > 0.6) effectiveRange = 60;
  else if (overallVisibility > 0.4) effectiveRange = 35;
  else if (overallVisibility > 0.2) effectiveRange = 20;
  else if (overallVisibility > 0.1) effectiveRange = 10;
  else effectiveRange = 5;
  
  const lightingCoverage = lightingDevices.length > 0
    ? Math.min(1.0, totalLightingIntensity / 150)
    : 0;
  
  return {
    overallVisibility,
    forwardVisibility,
    peripheralVisibility,
    effectiveRange,
    lightingCoverage,
    cargoShadowEffect,
  };
}

export function calculateNightObstacleRisk(
  visibility: NightVisibilityResult,
  nightConfig: NightNavigationConfig,
  flowSpeed: number
): NightObstacleRisk {
  const { obstacleDensity } = nightConfig;
  
  const detectionProbability = visibility.overallVisibility * 0.9;
  
  const safeStopDistance = flowSpeed * 3;
  const reactionTimeAvailable = visibility.effectiveRange / Math.max(1, flowSpeed);
  
  let collisionRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (visibility.overallVisibility < 0.15) {
    collisionRisk = 'critical';
  } else if (visibility.overallVisibility < 0.3) {
    collisionRisk = 'high';
  } else if (visibility.overallVisibility < 0.5) {
    collisionRisk = 'medium';
  } else if (obstacleDensity > 0.5 && visibility.overallVisibility < 0.7) {
    collisionRisk = 'medium';
  }
  
  if (safeStopDistance > visibility.effectiveRange * 0.7) {
    collisionRisk = collisionRisk === 'low' ? 'medium' : 
                    collisionRisk === 'medium' ? 'high' :
                    collisionRisk === 'high' ? 'critical' : 'critical';
  }
  
  const obstacleCount = Math.round(obstacleDensity * 10);
  
  return {
    detectionProbability,
    reactionTimeAvailable,
    collisionRisk,
    obstacleCount,
  };
}

function assessNightRiskLevel(
  visibility: NightVisibilityResult,
  obstacleRisk: NightObstacleRisk,
  nightConfig: NightNavigationConfig
): RiskLevel {
  const { timeOfDay } = nightConfig;
  
  if (timeOfDay === 'day') {
    return visibility.overallVisibility > 0.7 ? 'safe' : 'caution';
  }
  
  if (obstacleRisk.collisionRisk === 'critical' || visibility.overallVisibility < 0.15) {
    return 'danger';
  }
  
  if (visibility.overallVisibility < 0.3 || obstacleRisk.collisionRisk === 'high') {
    return 'warning';
  }
  
  if (visibility.overallVisibility < 0.5 || obstacleRisk.collisionRisk === 'medium') {
    return 'caution';
  }
  
  return 'safe';
}

function generateNightWarnings(
  nightConfig: NightNavigationConfig,
  visibility: NightVisibilityResult,
  obstacleRisk: NightObstacleRisk
): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];
  const { timeOfDay, lightingDevices } = nightConfig;
  
  const timeLabel = TIME_OF_DAY_LABELS[timeOfDay];
  
  if (timeOfDay === 'night') {
    warnings.push({
      id: 'night-time',
      type: visibility.overallVisibility < 0.3 ? 'warning' : 'info',
      title: `${timeLabel}航行`,
      description: `当前为${timeLabel}时段，能见度降低，请谨慎驾驶。`,
      riskLevel: visibility.overallVisibility < 0.3 ? 'warning' : 'caution',
    });
  } else if (timeOfDay === 'dusk') {
    warnings.push({
      id: 'dusk-time',
      type: 'info',
      title: `${timeLabel}时段`,
      description: `当前为${timeLabel}时段，光线逐渐变暗，建议开启照明设备。`,
      riskLevel: 'caution',
    });
  }
  
  if (lightingDevices.length === 0 && timeOfDay !== 'day') {
    warnings.push({
      id: 'no-lighting',
      type: 'error',
      title: '无照明设备',
      description: '当前未配置任何照明设备，夜间航行极度危险！',
      riskLevel: 'danger',
    });
  }
  
  if (visibility.overallVisibility < 0.2) {
    warnings.push({
      id: 'visibility-poor-night',
      type: 'error',
      title: '夜间能见度极差',
      description: `夜间能见度仅 ${(visibility.overallVisibility * 100).toFixed(0)}%，无法看清前方障碍物，严禁出航。`,
      riskLevel: 'danger',
    });
  } else if (visibility.overallVisibility < 0.4) {
    warnings.push({
      id: 'visibility-low-night',
      type: 'warning',
      title: '夜间能见度较低',
      description: `夜间能见度为 ${(visibility.overallVisibility * 100).toFixed(0)}%，航行时需特别注意。`,
      riskLevel: 'warning',
    });
  }
  
  if (visibility.cargoShadowEffect > 0.15) {
    warnings.push({
      id: 'cargo-shadow',
      type: 'warning',
      title: '货物遮挡照明',
      description: `货物对照明的遮挡影响约为 ${(visibility.cargoShadowEffect * 100).toFixed(1)}%，建议调整货物或照明位置。`,
      riskLevel: 'caution',
    });
  }
  
  if (obstacleRisk.collisionRisk === 'critical') {
    warnings.push({
      id: 'collision-critical',
      type: 'error',
      title: '碰撞风险极高',
      description: '当前能见度下碰撞风险极高，随时可能撞上障碍物，禁止出航！',
      riskLevel: 'danger',
    });
  } else if (obstacleRisk.collisionRisk === 'high') {
    warnings.push({
      id: 'collision-high',
      type: 'warning',
      title: '碰撞风险较高',
      description: '当前能见度下碰撞风险较高，建议加强照明或避免夜航。',
      riskLevel: 'warning',
    });
  }
  
  if (visibility.effectiveRange < 15 && timeOfDay !== 'day') {
    warnings.push({
      id: 'range-short',
      type: 'warning',
      title: '有效视距过短',
      description: `有效视距仅 ${visibility.effectiveRange.toFixed(0)} 米，反应时间不足，建议减速航行。`,
      riskLevel: 'warning',
    });
  }
  
  return warnings;
}

function generateNightRecommendations(
  nightConfig: NightNavigationConfig,
  visibility: NightVisibilityResult,
  obstacleRisk: NightObstacleRisk,
  riskLevel: RiskLevel
): WeatherRecommendation[] {
  const recommendations: WeatherRecommendation[] = [];
  const { timeOfDay, lightingDevices } = nightConfig;
  
  if (riskLevel === 'danger') {
    recommendations.push({
      id: 'night-rec-danger-1',
      priority: 'high',
      action: '禁止夜间出航',
      description: '当前夜间航行条件极差，强行出航可能危及生命安全，请取消计划。',
    });
    recommendations.push({
      id: 'night-rec-danger-2',
      priority: 'high',
      action: '等待白天或改善照明',
      description: '建议等待白天出航，或增加照明设备以提高能见度。',
    });
  }
  
  if (riskLevel === 'warning') {
    recommendations.push({
      id: 'night-rec-warning-1',
      priority: 'high',
      action: '建议推迟或取消夜航',
      description: '当前夜间航行风险较高，建议等待白天或改善照明条件后再出行。',
    });
    if (lightingDevices.length < 2) {
      recommendations.push({
        id: 'night-rec-warning-2',
        priority: 'medium',
        action: '增加照明设备',
        description: '建议增加更多照明设备，特别是探照灯和泛光灯，以提高能见度。',
      });
    }
  }
  
  if (riskLevel === 'caution') {
    recommendations.push({
      id: 'night-rec-caution-1',
      priority: 'medium',
      action: '谨慎夜航',
      description: '夜间航行存在一定风险，请降低航速，保持警惕。',
    });
    recommendations.push({
      id: 'night-rec-caution-2',
      priority: 'low',
      action: '检查照明设备',
      description: '出航前请确保所有照明设备工作正常，携带备用电源。',
    });
  }
  
  if (visibility.cargoShadowEffect > 0.1) {
    recommendations.push({
      id: 'night-rec-shadow',
      priority: 'medium',
      action: '优化货物布局',
      description: '货物对照明有一定遮挡，建议将高大货物移至竹筏中部或后部。',
    });
  }
  
  if (obstacleRisk.obstacleCount > 3) {
    recommendations.push({
      id: 'night-rec-obstacle',
      priority: 'medium',
      action: '避开障碍物密集区域',
      description: '该区域障碍物较多，建议选择熟悉的航道，或安排瞭望人员。',
    });
  }
  
  if (timeOfDay === 'dusk') {
    recommendations.push({
      id: 'night-rec-dusk',
      priority: 'low',
      action: '提前开启照明',
      description: '黄昏时段光线变化快，建议提前开启照明设备。',
    });
  }
  
  if (riskLevel === 'safe' && timeOfDay !== 'day') {
    recommendations.push({
      id: 'night-rec-safe',
      priority: 'low',
      action: '享受夜航',
      description: '夜间航行条件良好，照明充足，祝您航行愉快！',
    });
  }
  
  return recommendations;
}

function generateNightSummary(
  nightConfig: NightNavigationConfig,
  visibility: NightVisibilityResult,
  obstacleRisk: NightObstacleRisk,
  riskLevel: RiskLevel,
  canSailAtNight: boolean
): string {
  const timeLabel = TIME_OF_DAY_LABELS[nightConfig.timeOfDay];
  const riskLabel = RISK_LABELS[riskLevel];
  
  if (!canSailAtNight) {
    return `当前时段：${timeLabel}，风险等级：${riskLabel}。夜间能见度仅 ${(visibility.overallVisibility * 100).toFixed(0)}%，碰撞风险${obstacleRisk.collisionRisk === 'critical' ? '极高' : '较高'}，禁止夜间出航！`;
  }
  
  if (riskLevel === 'warning') {
    return `当前时段：${timeLabel}，风险等级：${riskLabel}。夜间能见度 ${(visibility.overallVisibility * 100).toFixed(0)}%，有效视距 ${visibility.effectiveRange.toFixed(0)} 米。不建议夜间出航，如必须出行请做好充分准备。`;
  }
  
  if (riskLevel === 'caution') {
    return `当前时段：${timeLabel}，风险等级：${riskLabel}。夜间能见度 ${(visibility.overallVisibility * 100).toFixed(0)}%，有效视距 ${visibility.effectiveRange.toFixed(0)} 米。可以夜间出航，但请保持谨慎，注意安全。`;
  }
  
  return `当前时段：${timeLabel}，风险等级：${riskLabel}。夜间能见度 ${(visibility.overallVisibility * 100).toFixed(0)}%，有效视距 ${visibility.effectiveRange.toFixed(0)} 米。夜航条件良好，适合航行。祝您航行顺利！`;
}

export function generateNightNavigationReport(
  config: RaftConfig,
  cargos: Cargo[],
  weatherReport?: WeatherReport
): NightNavigationReport {
  const nightConfig = config.nightNavigation;
  
  const visibility = calculateNightVisibility(nightConfig, cargos, config, weatherReport);
  
  const adjustedFlowSpeed = weatherReport
    ? config.waterFlowSpeed * weatherReport.effects.flowSpeedMultiplier
    : config.waterFlowSpeed;
  
  const obstacleRisk = calculateNightObstacleRisk(visibility, nightConfig, adjustedFlowSpeed);
  
  const riskLevel = assessNightRiskLevel(visibility, obstacleRisk, nightConfig);
  
  const warnings = generateNightWarnings(nightConfig, visibility, obstacleRisk);
  const recommendations = generateNightRecommendations(nightConfig, visibility, obstacleRisk, riskLevel);
  
  const totalLightingIntensity = calculateTotalLightingIntensity(nightConfig.lightingDevices);
  
  const hasDanger = warnings.some((w) => w.riskLevel === 'danger');
  const hasCriticalCollision = obstacleRisk.collisionRisk === 'critical';
  const hasPoorVisibility = visibility.overallVisibility < 0.15;
  const noLightingAtNight = nightConfig.lightingDevices.length === 0 && nightConfig.timeOfDay !== 'day';
  
  const canSailAtNight = !hasDanger && !hasCriticalCollision && !hasPoorVisibility && !noLightingAtNight;
  
  let safetyScore = visibility.overallVisibility * 60 + (1 - obstacleRisk.detectionProbability) * -20 + 40;
  safetyScore = Math.max(0, Math.min(100, safetyScore));
  
  const summary = generateNightSummary(nightConfig, visibility, obstacleRisk, riskLevel, canSailAtNight);
  
  return {
    config: nightConfig,
    visibility,
    obstacleRisk,
    safetyScore: Math.round(safetyScore),
    riskLevel,
    canSailAtNight,
    warnings,
    recommendations,
    totalLightingIntensity,
    summary,
  };
}

export {
  TIME_OF_DAY_LIGHT,
  TIME_OF_DAY_LABELS,
  LIGHTING_DEVICE_INTENSITY,
  LIGHTING_DEVICE_RANGE,
  LIGHTING_DEVICE_ANGLE,
};
