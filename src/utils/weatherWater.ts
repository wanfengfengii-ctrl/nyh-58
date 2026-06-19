import type {
  WeatherWaterConfig,
  WeatherWaterEffects,
  WeatherReport,
  WeatherWarning,
  WeatherRecommendation,
  RiskLevel,
  RaftConfig,
  StabilityResult,
} from '../types';
import { WEATHER_LABELS, RISK_LABELS } from '../constants';

const weatherFlowMultipliers: Record<string, number> = {
  sunny: 1.0,
  cloudy: 1.1,
  rainy: 1.3,
  stormy: 1.8,
};

const waterFlowMultipliers: Record<string, number> = {
  calm: 1.0,
  ripple: 1.3,
  rapid: 2.0,
  torrent: 3.5,
};

const windFlowMultipliers: Record<string, number> = {
  calm: 1.0,
  breeze: 1.1,
  windy: 1.4,
  strong: 2.0,
};

const weatherStabilityPenalties: Record<string, number> = {
  sunny: 0,
  cloudy: 2,
  rainy: 8,
  stormy: 20,
};

const waterStabilityPenalties: Record<string, number> = {
  calm: 0,
  ripple: 5,
  rapid: 15,
  torrent: 30,
};

const windStabilityPenalties: Record<string, number> = {
  calm: 0,
  breeze: 3,
  windy: 12,
  strong: 25,
};

const waveHeights: Record<string, number> = {
  calm: 0,
  ripple: 0.1,
  rapid: 0.3,
  torrent: 0.6,
};

const visibilityLevels: Record<string, number> = {
  sunny: 1.0,
  cloudy: 0.9,
  rainy: 0.6,
  stormy: 0.3,
};

export function calculateWeatherEffects(config: WeatherWaterConfig): WeatherWaterEffects {
  const flowSpeedMultiplier =
    weatherFlowMultipliers[config.weather] *
    waterFlowMultipliers[config.water] *
    windFlowMultipliers[config.wind];

  const stabilityPenalty =
    weatherStabilityPenalties[config.weather] +
    waterStabilityPenalties[config.water] +
    windStabilityPenalties[config.wind];

  const waveHeight = waveHeights[config.water] * weatherFlowMultipliers[config.weather];
  const visibility = visibilityLevels[config.weather];

  return {
    flowSpeedMultiplier,
    stabilityPenalty,
    waveHeight,
    visibility,
  };
}

export function calculateAdjustedFlowSpeed(
  baseFlowSpeed: number,
  effects: WeatherWaterEffects
): number {
  return baseFlowSpeed * effects.flowSpeedMultiplier;
}

export function calculateAdjustedStabilityScore(
  baseScore: number,
  effects: WeatherWaterEffects
): number {
  return Math.max(0, baseScore - effects.stabilityPenalty);
}

function assessRiskLevel(
  effects: WeatherWaterEffects,
  adjustedStability: number
): RiskLevel {
  const { flowSpeedMultiplier, stabilityPenalty, visibility } = effects;

  if (
    flowSpeedMultiplier >= 2.5 ||
    stabilityPenalty >= 40 ||
    adjustedStability < 30 ||
    visibility < 0.4
  ) {
    return 'danger';
  }

  if (
    flowSpeedMultiplier >= 1.8 ||
    stabilityPenalty >= 25 ||
    adjustedStability < 50 ||
    visibility < 0.7
  ) {
    return 'warning';
  }

  if (
    flowSpeedMultiplier >= 1.3 ||
    stabilityPenalty >= 10 ||
    adjustedStability < 70 ||
    visibility < 0.9
  ) {
    return 'caution';
  }

  return 'safe';
}

function generateWarnings(
  config: WeatherWaterConfig,
  effects: WeatherWaterEffects,
  adjustedFlowSpeed: number,
  adjustedStability: number
): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];

  if (config.weather === 'stormy') {
    warnings.push({
      id: 'weather-storm',
      type: 'error',
      title: '暴风雨天气',
      description: '当前为暴风雨天气，能见度极低，风浪巨大，航行极度危险。',
      riskLevel: 'danger',
    });
  } else if (config.weather === 'rainy') {
    warnings.push({
      id: 'weather-rain',
      type: 'warning',
      title: '降雨天气',
      description: '当前有降雨，能见度下降，路面湿滑，请注意航行安全。',
      riskLevel: 'caution',
    });
  } else if (config.weather === 'cloudy') {
    warnings.push({
      id: 'weather-cloud',
      type: 'info',
      title: '阴天',
      description: '当前为阴天，光线较暗，请注意观察周围环境。',
      riskLevel: 'safe',
    });
  } else {
    warnings.push({
      id: 'weather-sunny',
      type: 'success',
      title: '晴朗天气',
      description: '天气晴朗，能见度良好，非常适合航行。',
      riskLevel: 'safe',
    });
  }

  if (config.water === 'torrent') {
    warnings.push({
      id: 'water-torrent',
      type: 'error',
      title: '洪峰水流',
      description: `水流速度达到 ${adjustedFlowSpeed.toFixed(1)}m/s，水流汹涌，随时可能发生翻船事故。`,
      riskLevel: 'danger',
    });
  } else if (config.water === 'rapid') {
    warnings.push({
      id: 'water-rapid',
      type: 'warning',
      title: '湍急水流',
      description: `水流速度达到 ${adjustedFlowSpeed.toFixed(1)}m/s，水流湍急，对竹筏稳定性有较大影响。`,
      riskLevel: 'warning',
    });
  } else if (config.water === 'ripple') {
    warnings.push({
      id: 'water-ripple',
      type: 'info',
      title: '微波水面',
      description: `水面有轻微波浪，水流速度 ${adjustedFlowSpeed.toFixed(1)}m/s，对航行影响较小。`,
      riskLevel: 'caution',
    });
  } else {
    warnings.push({
      id: 'water-calm',
      type: 'success',
      title: '平静水面',
      description: `水面平静，水流速度 ${adjustedFlowSpeed.toFixed(1)}m/s，航行条件极佳。`,
      riskLevel: 'safe',
    });
  }

  if (config.wind === 'strong') {
    warnings.push({
      id: 'wind-strong',
      type: 'error',
      title: '强风天气',
      description: '强风天气，竹筏可能被吹翻，请勿出航。',
      riskLevel: 'danger',
    });
  } else if (config.wind === 'windy') {
    warnings.push({
      id: 'wind-windy',
      type: 'warning',
      title: '大风天气',
      description: '风力较大，竹筏容易受到横风影响，需要谨慎驾驶。',
      riskLevel: 'warning',
    });
  } else if (config.wind === 'breeze') {
    warnings.push({
      id: 'wind-breeze',
      type: 'info',
      title: '微风',
      description: '有轻微风，对竹筏航行影响不大。',
      riskLevel: 'safe',
    });
  } else {
    warnings.push({
      id: 'wind-calm',
      type: 'success',
      title: '无风',
      description: '无风天气，航行平稳。',
      riskLevel: 'safe',
    });
  }

  if (adjustedStability < 40) {
    warnings.push({
      id: 'stability-critical',
      type: 'error',
      title: '稳定性极差',
      description: `受环境影响，稳定性评分降至 ${adjustedStability.toFixed(0)}，竹筏极易倾覆。`,
      riskLevel: 'danger',
    });
  } else if (adjustedStability < 60) {
    warnings.push({
      id: 'stability-low',
      type: 'warning',
      title: '稳定性下降',
      description: `受环境影响，稳定性评分降至 ${adjustedStability.toFixed(0)}，航行时需特别注意。`,
      riskLevel: 'warning',
    });
  }

  if (adjustedFlowSpeed > 8) {
    warnings.push({
      id: 'flow-extreme',
      type: 'error',
      title: '水流速度过快',
      description: `水流速度 ${adjustedFlowSpeed.toFixed(1)}m/s 超过安全阈值 8m/s，无法控制竹筏。`,
      riskLevel: 'danger',
    });
  } else if (adjustedFlowSpeed > 5) {
    warnings.push({
      id: 'flow-fast',
      type: 'warning',
      title: '水流速度较快',
      description: `水流速度 ${adjustedFlowSpeed.toFixed(1)}m/s，对操控有一定影响。`,
      riskLevel: 'warning',
    });
  }

  if (effects.visibility < 0.5) {
    warnings.push({
      id: 'visibility-poor',
      type: 'error',
      title: '能见度极差',
      description: `能见度仅 ${(effects.visibility * 100).toFixed(0)}%，无法看清前方障碍物。`,
      riskLevel: 'danger',
    });
  } else if (effects.visibility < 0.7) {
    warnings.push({
      id: 'visibility-low',
      type: 'warning',
      title: '能见度较低',
      description: `能见度为 ${(effects.visibility * 100).toFixed(0)}%，请注意观察。`,
      riskLevel: 'warning',
    });
  }

  return warnings;
}

function generateRecommendations(
  config: WeatherWaterConfig,
  riskLevel: RiskLevel,
  adjustedStability: number
): WeatherRecommendation[] {
  const recommendations: WeatherRecommendation[] = [];

  if (riskLevel === 'danger') {
    recommendations.push({
      id: 'rec-danger-1',
      priority: 'high',
      action: '立即取消出航计划',
      description: '当前环境风险极高，强行出航可能危及生命安全，请立即取消计划。',
    });
    recommendations.push({
      id: 'rec-danger-2',
      priority: 'high',
      action: '寻找安全庇护所',
      description: '如已在水面，请立即靠岸，寻找安全地点躲避恶劣天气。',
    });
  }

  if (riskLevel === 'warning') {
    recommendations.push({
      id: 'rec-warning-1',
      priority: 'high',
      action: '建议推迟出航',
      description: '当前环境条件较差，建议等待天气好转后再出航。',
    });
    recommendations.push({
      id: 'rec-warning-2',
      priority: 'medium',
      action: '减少货物载重',
      description: '降低竹筏载重可以提高稳定性，建议减少不必要的货物。',
    });
    recommendations.push({
      id: 'rec-warning-3',
      priority: 'medium',
      action: '配备安全装备',
      description: '请务必穿戴救生衣，并携带应急通讯设备。',
    });
  }

  if (riskLevel === 'caution') {
    recommendations.push({
      id: 'rec-caution-1',
      priority: 'medium',
      action: '谨慎驾驶',
      description: '环境存在一定风险，请降低航行速度，保持警惕。',
    });
    recommendations.push({
      id: 'rec-caution-2',
      priority: 'low',
      action: '检查设备',
      description: '出航前请检查竹筏结构和安全设备是否完好。',
    });
  }

  if (adjustedStability < 60) {
    recommendations.push({
      id: 'rec-stability-1',
      priority: 'high',
      action: '重新调整货物分布',
      description: '当前稳定性不足，请将货物向中心位置移动，降低重心。',
    });
  }

  if (config.wind !== 'calm') {
    recommendations.push({
      id: 'rec-wind-1',
      priority: 'medium',
      action: '注意横风影响',
      description: '有风天气请特别注意横风对竹筏的影响，必要时调整航向。',
    });
  }

  if (config.water !== 'calm') {
    recommendations.push({
      id: 'rec-water-1',
      priority: 'medium',
      action: '避免急流区域',
      description: '水流较快时请尽量避开主航道，选择水流相对平缓的区域航行。',
    });
  }

  if (riskLevel === 'safe') {
    recommendations.push({
      id: 'rec-safe-1',
      priority: 'low',
      action: '享受航行',
      description: '当前天气水况良好，适合航行，祝您旅途愉快！',
    });
  }

  return recommendations;
}

function generateSummary(
  config: WeatherWaterConfig,
  riskLevel: RiskLevel,
  canSail: boolean,
  adjustedStability: number
): string {
  const weatherLabel = WEATHER_LABELS[config.weather];
  const waterLabel = WEATHER_LABELS[config.water];
  const windLabel = WEATHER_LABELS[config.wind];
  const riskLabel = RISK_LABELS[riskLevel];

  if (!canSail) {
    return `当前环境：${weatherLabel}、${waterLabel}、${windLabel}，风险等级：${riskLabel}。环境条件恶劣，禁止出航！请等待天气好转后再作打算。`;
  }

  if (riskLevel === 'warning') {
    return `当前环境：${weatherLabel}、${waterLabel}、${windLabel}，风险等级：${riskLabel}。稳定性评分 ${adjustedStability.toFixed(0)}。不建议出航，如必须出行请做好充分准备。`;
  }

  if (riskLevel === 'caution') {
    return `当前环境：${weatherLabel}、${waterLabel}、${windLabel}，风险等级：${riskLabel}。稳定性评分 ${adjustedStability.toFixed(0)}。可以出航，但请保持谨慎，注意安全。`;
  }

  return `当前环境：${weatherLabel}、${waterLabel}、${windLabel}，风险等级：${riskLabel}。稳定性评分 ${adjustedStability.toFixed(0)}。环境条件良好，适合出航。祝您航行顺利！`;
}

export function generateWeatherReport(
  config: RaftConfig,
  baseStability: StabilityResult
): WeatherReport {
  const weatherConfig = config.weatherWater;
  const effects = calculateWeatherEffects(weatherConfig);

  const adjustedFlowSpeed = calculateAdjustedFlowSpeed(config.waterFlowSpeed, effects);
  const adjustedStabilityScore = calculateAdjustedStabilityScore(
    baseStability.stabilityScore,
    effects
  );

  const riskLevel = assessRiskLevel(effects, adjustedStabilityScore);
  const warnings = generateWarnings(weatherConfig, effects, adjustedFlowSpeed, adjustedStabilityScore);
  const recommendations = generateRecommendations(weatherConfig, riskLevel, adjustedStabilityScore);

  const hasDanger = warnings.some((w) => w.riskLevel === 'danger');
  const hasHighStabilityPenalty = adjustedStabilityScore < 40;
  const canSail = !hasDanger && !hasHighStabilityPenalty && baseStability.isSailable;

  const riskScore = Math.min(
    100,
    Math.max(0, 100 - effects.stabilityPenalty - effects.flowSpeedMultiplier * 10)
  );

  const summary = generateSummary(weatherConfig, riskLevel, canSail, adjustedStabilityScore);

  return {
    config: weatherConfig,
    effects,
    riskLevel,
    canSail,
    warnings,
    recommendations,
    riskScore,
    summary,
  };
}

export function getAdjustedStability(
  baseStability: StabilityResult,
  weatherReport: WeatherReport
): StabilityResult {
  const adjustedScore = calculateAdjustedStabilityScore(
    baseStability.stabilityScore,
    weatherReport.effects
  );

  let tiltRisk: 'low' | 'medium' | 'high' = 'low';
  if (Math.abs(baseStability.leftRightBalance) > 0.3 || adjustedScore < 60) {
    tiltRisk = 'medium';
  }
  if (Math.abs(baseStability.leftRightBalance) > 0.5 || adjustedScore < 35) {
    tiltRisk = 'high';
  }

  const isSailable =
    weatherReport.canSail &&
    adjustedScore >= 40 &&
    Math.abs(baseStability.leftRightBalance) <= 0.45;

  return {
    ...baseStability,
    stabilityScore: adjustedScore,
    tiltRisk,
    isSailable,
  };
}
