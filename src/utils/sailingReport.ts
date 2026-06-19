import type { RaftConfig, Cargo, BuoyancyResult, StabilityResult, SailingReport, SailingReason, WeatherReport } from '../types';
import { isCargoWithinBounds } from './raftGeometry';
import { calculateAdjustedFlowSpeed } from './weatherWater';

export function generateSailingReport(
  config: RaftConfig,
  cargos: Cargo[],
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  allInBounds: boolean,
  weatherReport?: WeatherReport
): SailingReport {
  const reasons: SailingReason[] = [];
  let score = 0;

  const adjustedFlowSpeed = weatherReport
    ? calculateAdjustedFlowSpeed(config.waterFlowSpeed, weatherReport.effects)
    : config.waterFlowSpeed;

  reasons.push(...analyzeLoadStatus(buoyancy));
  reasons.push(...analyzeStability(stability));
  reasons.push(...analyzeCenterOfGravity(stability));
  reasons.push(...analyzeBounds(allInBounds, cargos, config));
  reasons.push(...analyzeWaterFlow(config, adjustedFlowSpeed, weatherReport));
  reasons.push(...analyzeDraftDepth(buoyancy, config));

  if (weatherReport) {
    reasons.push(...analyzeWeatherConditions(weatherReport));
  }

  const errorCount = reasons.filter((r) => r.type === 'error').length;
  const warningCount = reasons.filter((r) => r.type === 'warning').length;
  const successCount = reasons.filter((r) => r.type === 'success').length;

  score = Math.max(
    0,
    Math.min(
      100,
      successCount * 15 - errorCount * 30 - warningCount * 10 + stability.stabilityScore * 0.4
    )
  );

  const weatherCanSail = weatherReport ? weatherReport.canSail : true;
  const canSail = errorCount === 0 && stability.isSailable && allInBounds && !buoyancy.isOverloaded && weatherCanSail;

  const summary = generateSummary(canSail, errorCount, warningCount, buoyancy, stability);

  return {
    canSail,
    score: Math.round(score),
    reasons,
    summary,
  };
}

function analyzeLoadStatus(buoyancy: BuoyancyResult): SailingReason[] {
  const reasons: SailingReason[] = [];
  const loadRatio = buoyancy.loadRatio;

  if (buoyancy.isOverloaded) {
    reasons.push({
      id: 'load-overload',
      type: 'error',
      title: '竹筏超载',
      description: `总重量 ${buoyancy.totalWeight.toFixed(1)}N 超过最大浮力 ${buoyancy.totalBuoyancy.toFixed(1)}N，竹筏将沉没`,
      value: buoyancy.totalWeight,
      threshold: buoyancy.totalBuoyancy,
    });
  } else if (loadRatio > 0.9) {
    reasons.push({
      id: 'load-warning',
      type: 'warning',
      title: '载重接近上限',
      description: `载重比例达到 ${(loadRatio * 100).toFixed(1)}%，接近最大承载能力，航行风险较高`,
      value: loadRatio,
      threshold: 0.9,
    });
  } else if (loadRatio > 0.7) {
    reasons.push({
      id: 'load-info',
      type: 'info',
      title: '载重适中',
      description: `载重比例为 ${(loadRatio * 100).toFixed(1)}%，处于合理范围`,
      value: loadRatio,
      threshold: 0.7,
    });
  } else {
    reasons.push({
      id: 'load-success',
      type: 'success',
      title: '载重状态良好',
      description: `载重比例为 ${(loadRatio * 100).toFixed(1)}%，剩余浮力充足`,
      value: loadRatio,
      threshold: 0.7,
    });
  }

  return reasons;
}

function analyzeStability(stability: StabilityResult): SailingReason[] {
  const reasons: SailingReason[] = [];

  if (stability.tiltRisk === 'high') {
    reasons.push({
      id: 'stability-high-risk',
      type: 'error',
      title: '倾覆风险极高',
      description: `稳定性评分 ${stability.stabilityScore.toFixed(1)}，倾斜风险等级为高，极易发生倾覆`,
      value: stability.stabilityScore,
      threshold: 35,
    });
  } else if (stability.tiltRisk === 'medium') {
    reasons.push({
      id: 'stability-medium-risk',
      type: 'warning',
      title: '存在倾覆风险',
      description: `稳定性评分 ${stability.stabilityScore.toFixed(1)}，倾斜风险等级为中，航行时需谨慎`,
      value: stability.stabilityScore,
      threshold: 60,
    });
  } else {
    reasons.push({
      id: 'stability-success',
      type: 'success',
      title: '稳定性良好',
      description: `稳定性评分 ${stability.stabilityScore.toFixed(1)}，倾斜风险等级为低，航行安全`,
      value: stability.stabilityScore,
      threshold: 60,
    });
  }

  return reasons;
}

function analyzeCenterOfGravity(stability: StabilityResult): SailingReason[] {
  const reasons: SailingReason[] = [];
  const lrBalance = Math.abs(stability.leftRightBalance);
  const fbBalance = Math.abs(stability.frontBackBalance);

  if (lrBalance > 0.45) {
    reasons.push({
      id: 'cg-left-right-error',
      type: 'error',
      title: '左右重心严重失衡',
      description: `左右重心偏差 ${(lrBalance * 100).toFixed(1)}%，超过安全阈值 45%`,
      value: lrBalance,
      threshold: 0.45,
    });
  } else if (lrBalance > 0.3) {
    reasons.push({
      id: 'cg-left-right-warning',
      type: 'warning',
      title: '左右重心偏差较大',
      description: `左右重心偏差 ${(lrBalance * 100).toFixed(1)}%，建议调整货物位置`,
      value: lrBalance,
      threshold: 0.3,
    });
  } else {
    reasons.push({
      id: 'cg-left-right-success',
      type: 'success',
      title: '左右重心平衡良好',
      description: `左右重心偏差 ${(lrBalance * 100).toFixed(1)}%，处于安全范围`,
      value: lrBalance,
      threshold: 0.3,
    });
  }

  if (fbBalance > 0.3) {
    reasons.push({
      id: 'cg-front-back-warning',
      type: 'warning',
      title: '前后重心偏差较大',
      description: `前后重心偏差 ${(fbBalance * 100).toFixed(1)}%，建议调整货物位置`,
      value: fbBalance,
      threshold: 0.3,
    });
  } else {
    reasons.push({
      id: 'cg-front-back-success',
      type: 'success',
      title: '前后重心平衡良好',
      description: `前后重心偏差 ${(fbBalance * 100).toFixed(1)}%，处于安全范围`,
      value: fbBalance,
      threshold: 0.3,
    });
  }

  return reasons;
}

function analyzeBounds(allInBounds: boolean, cargos: Cargo[], config: RaftConfig): SailingReason[] {
  const reasons: SailingReason[] = [];

  if (allInBounds) {
    reasons.push({
      id: 'bounds-success',
      type: 'success',
      title: '货物位置合法',
      description: `所有 ${cargos.length} 件货物均在竹筏边界内`,
      value: cargos.length,
      threshold: 0,
    });
  } else {
    const outOfBoundsCount = cargos.filter(
      (cargo) =>
        !isCargoWithinBounds(cargo.x, cargo.y, cargo.width, cargo.height, config)
    ).length;

    reasons.push({
      id: 'bounds-error',
      type: 'error',
      title: '货物超出边界',
      description: `有 ${outOfBoundsCount} 件货物超出竹筏边界，可能在航行中掉落`,
      value: outOfBoundsCount,
      threshold: 0,
    });
  }

  return reasons;
}

function analyzeWaterFlow(
  config: RaftConfig,
  adjustedFlowSpeed: number,
  weatherReport?: WeatherReport
): SailingReason[] {
  const reasons: SailingReason[] = [];
  const baseFlowSpeed = config.waterFlowSpeed;
  const flowSpeed = adjustedFlowSpeed;

  if (weatherReport && Math.abs(flowSpeed - baseFlowSpeed) > 0.1) {
    reasons.push({
      id: 'flow-adjusted',
      type: 'info',
      title: '水流速度已调整',
      description: `受天气水况影响，实际水流速度从 ${baseFlowSpeed.toFixed(1)}m/s 调整为 ${flowSpeed.toFixed(1)}m/s（${weatherReport.effects.flowSpeedMultiplier.toFixed(2)}倍）`,
      value: flowSpeed,
      threshold: baseFlowSpeed,
    });
  }

  if (flowSpeed > 8) {
    reasons.push({
      id: 'flow-error',
      type: 'error',
      title: '水流速度过快',
      description: `水流速度 ${flowSpeed.toFixed(1)}m/s 超过安全阈值 8m/s，航行极度危险`,
      value: flowSpeed,
      threshold: 8,
    });
  } else if (flowSpeed > 5) {
    reasons.push({
      id: 'flow-warning',
      type: 'warning',
      title: '水流速度较快',
      description: `水流速度 ${flowSpeed.toFixed(1)}m/s，对航行有一定影响，稳定性下降`,
      value: flowSpeed,
      threshold: 5,
    });
  } else if (flowSpeed > 2) {
    reasons.push({
      id: 'flow-info',
      type: 'info',
      title: '水流速度适中',
      description: `水流速度 ${flowSpeed.toFixed(1)}m/s，对航行影响较小`,
      value: flowSpeed,
      threshold: 2,
    });
  } else {
    reasons.push({
      id: 'flow-success',
      type: 'success',
      title: '水流条件良好',
      description: `水流速度 ${flowSpeed.toFixed(1)}m/s，非常适合航行`,
      value: flowSpeed,
      threshold: 2,
    });
  }

  return reasons;
}

function analyzeDraftDepth(buoyancy: BuoyancyResult, config: RaftConfig): SailingReason[] {
  const reasons: SailingReason[] = [];
  const draftDepth = buoyancy.draftDepth;
  const maxDraft = config.tubeDiameter;
  const draftRatio = draftDepth / maxDraft;

  if (draftRatio >= 1) {
    reasons.push({
      id: 'draft-error',
      type: 'error',
      title: '吃水深度过深',
      description: `吃水深度 ${draftDepth.toFixed(2)}m 已达到竹筒直径 ${maxDraft.toFixed(2)}m，竹筏即将沉没`,
      value: draftDepth,
      threshold: maxDraft,
    });
  } else if (draftRatio > 0.8) {
    reasons.push({
      id: 'draft-warning',
      type: 'warning',
      title: '吃水深度较深',
      description: `吃水深度 ${draftDepth.toFixed(2)}m，为竹筒直径的 ${(draftRatio * 100).toFixed(1)}%，干舷不足`,
      value: draftDepth,
      threshold: maxDraft * 0.8,
    });
  } else if (draftRatio > 0.5) {
    reasons.push({
      id: 'draft-info',
      type: 'info',
      title: '吃水深度适中',
      description: `吃水深度 ${draftDepth.toFixed(2)}m，为竹筒直径的 ${(draftRatio * 100).toFixed(1)}%`,
      value: draftDepth,
      threshold: maxDraft * 0.5,
    });
  } else {
    reasons.push({
      id: 'draft-success',
      type: 'success',
      title: '吃水深度安全',
      description: `吃水深度 ${draftDepth.toFixed(2)}m，为竹筒直径的 ${(draftRatio * 100).toFixed(1)}%，干舷充足`,
      value: draftDepth,
      threshold: maxDraft * 0.5,
    });
  }

  return reasons;
}

function generateSummary(
  canSail: boolean,
  errorCount: number,
  warningCount: number,
  buoyancy: BuoyancyResult,
  stability: StabilityResult
): string {
  if (!canSail) {
    if (buoyancy.isOverloaded) {
      return '竹筏超载，无法出航。请减少货物重量或增加竹筒数量。';
    }
    if (errorCount > 0) {
      return `存在 ${errorCount} 项严重问题，无法出航。请修复后再尝试。`;
    }
    if (!stability.isSailable) {
      return '稳定性不足，无法出航。请重新调整货物分布以改善平衡。';
    }
  }

  if (warningCount > 0) {
    return `可以出航，但存在 ${warningCount} 项警告。建议在航行中保持谨慎，或进一步优化货物配置。`;
  }

  return '各项指标良好，可以安全出航。祝您航行顺利！';
}

function analyzeWeatherConditions(weatherReport: WeatherReport): SailingReason[] {
  const reasons: SailingReason[] = [];
  const { riskLevel, effects } = weatherReport;

  if (weatherReport.warnings.length > 0) {
    const weatherWarnings = weatherReport.warnings.filter(
      (w) => w.type === 'error' || w.type === 'warning'
    );
    weatherWarnings.forEach((warning) => {
      reasons.push({
        id: `weather-warning-${warning.id}`,
        type: warning.type,
        title: `环境预警: ${warning.title}`,
        description: warning.description,
        value: effects.stabilityPenalty,
        threshold: 10,
      });
    });
  }

  if (riskLevel === 'danger') {
    reasons.push({
      id: 'weather-risk-danger',
      type: 'error',
      title: '环境风险极高',
      description: `当前环境风险等级为"危险"，稳定性惩罚 ${effects.stabilityPenalty} 分，水流速度倍率 ${effects.flowSpeedMultiplier.toFixed(2)}，禁止出航。`,
      value: effects.stabilityPenalty,
      threshold: 40,
    });
  } else if (riskLevel === 'warning') {
    reasons.push({
      id: 'weather-risk-warning',
      type: 'warning',
      title: '环境风险较高',
      description: `当前环境风险等级为"警告"，稳定性惩罚 ${effects.stabilityPenalty} 分，水流速度倍率 ${effects.flowSpeedMultiplier.toFixed(2)}，不建议出航。`,
      value: effects.stabilityPenalty,
      threshold: 25,
    });
  } else if (riskLevel === 'caution') {
    reasons.push({
      id: 'weather-risk-caution',
      type: 'info',
      title: '环境有一定风险',
      description: `当前环境风险等级为"注意"，稳定性惩罚 ${effects.stabilityPenalty} 分，水流速度倍率 ${effects.flowSpeedMultiplier.toFixed(2)}，请谨慎驾驶。`,
      value: effects.stabilityPenalty,
      threshold: 10,
    });
  } else {
    reasons.push({
      id: 'weather-risk-safe',
      type: 'success',
      title: '环境条件良好',
      description: `当前环境风险等级为"安全"，稳定性惩罚 ${effects.stabilityPenalty} 分，水流速度倍率 ${effects.flowSpeedMultiplier.toFixed(2)}，适合航行。`,
      value: effects.stabilityPenalty,
      threshold: 10,
    });
  }

  if (effects.visibility < 0.7) {
    reasons.push({
      id: 'weather-visibility',
      type: effects.visibility < 0.5 ? 'error' : 'warning',
      title: '能见度不足',
      description: `当前能见度为 ${(effects.visibility * 100).toFixed(0)}%，${effects.visibility < 0.5 ? '严重影响航行安全' : '对航行有一定影响'}。`,
      value: effects.visibility,
      threshold: 0.7,
    });
  }

  if (effects.waveHeight > 0.2) {
    reasons.push({
      id: 'weather-wave',
      type: effects.waveHeight > 0.4 ? 'error' : 'warning',
      title: '浪高较大',
      description: `当前浪高约 ${effects.waveHeight.toFixed(2)}m，${effects.waveHeight > 0.4 ? '可能导致竹筏倾覆' : '会影响竹筏稳定性'}。`,
      value: effects.waveHeight,
      threshold: 0.2,
    });
  }

  return reasons;
}
