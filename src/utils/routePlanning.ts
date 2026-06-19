import type {
  RaftConfig,
  BuoyancyResult,
  StabilityResult,
  WeatherReport,
  NightNavigationReport,
  RiverZone,
  RoutePoint,
  RouteSegment,
  RouteHazard,
  RoutePlan,
  RoutePlanningInput,
  RoutePlanningResult,
  RiskLevel,
} from '../types';
import {
  RIVER_ZONE_FLOW_SPEEDS,
  RIVER_ZONE_RISK_SCORES,
  ROUTE_PLAN_TAGS,
  TIME_OF_DAY_LABELS,
} from '../constants';
import { calculateWeatherEffects, calculateAdjustedFlowSpeed } from './weatherWater';

function getZonesBetweenPoints(
  from: RoutePoint,
  to: RoutePoint,
  zones: RiverZone[]
): RiverZone[] {
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  return zones.filter((zone) => {
    const zoneBottom = zone.y + zone.height;
    return zone.y < maxY && zoneBottom > minY;
  });
}

function calculateSegmentDistance(from: RoutePoint, to: RoutePoint): number {
  const dx = (to.x - from.x) * 0.5;
  const dy = (to.y - from.y) * 0.5;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateSegmentFlowSpeed(
  zones: RiverZone[],
  weatherReport: WeatherReport | null,
  baseFlowSpeed: number
): number {
  if (zones.length === 0) return baseFlowSpeed;

  const avgZoneFlow = zones.reduce((sum, z) => sum + z.baseFlowSpeed, 0) / zones.length;

  if (weatherReport) {
    const effects = calculateWeatherEffects(weatherReport.config);
    return calculateAdjustedFlowSpeed(avgZoneFlow, effects);
  }

  return avgZoneFlow;
}

function calculateSegmentSafetyScore(
  zones: RiverZone[],
  stability: StabilityResult,
  buoyancy: BuoyancyResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null
): number {
  if (zones.length === 0) return 70;

  const avgZoneRisk = zones.reduce((sum, z) => sum + z.baseRiskScore, 0) / zones.length;

  let score = avgZoneRisk;

  const stabilityFactor = Math.min(stability.stabilityScore / 100, 1);
  score *= 0.5 + stabilityFactor * 0.5;

  if (buoyancy.loadRatio > 0.9) {
    score *= 0.6;
  } else if (buoyancy.loadRatio > 0.7) {
    score *= 0.8;
  }

  if (buoyancy.isOverloaded) {
    score *= 0.1;
  }

  if (weatherReport) {
    const weatherPenalty = weatherReport.effects.stabilityPenalty;
    score -= weatherPenalty * 0.5;

    if (weatherReport.effects.visibility < 0.5) {
      score *= 0.5;
    } else if (weatherReport.effects.visibility < 0.7) {
      score *= 0.7;
    }

    if (weatherReport.effects.waveHeight > 0.4) {
      score *= 0.5;
    } else if (weatherReport.effects.waveHeight > 0.2) {
      score *= 0.8;
    }
  }

  if (nightNavigationReport) {
    const nightVisibility = nightNavigationReport.visibility.overallVisibility;
    if (nightVisibility < 0.2) {
      score *= 0.3;
    } else if (nightVisibility < 0.4) {
      score *= 0.5;
    } else if (nightVisibility < 0.6) {
      score *= 0.7;
    } else if (nightVisibility < 0.8) {
      score *= 0.85;
    }

    if (nightNavigationReport.obstacleRisk.collisionRisk === 'critical') {
      score *= 0.2;
    } else if (nightNavigationReport.obstacleRisk.collisionRisk === 'high') {
      score *= 0.5;
    } else if (nightNavigationReport.obstacleRisk.collisionRisk === 'medium') {
      score *= 0.8;
    }

    score += nightNavigationReport.safetyScore * 0.1;
  }

  return Math.max(0, Math.min(100, score));
}

function determineRiskLevel(safetyScore: number): RiskLevel {
  if (safetyScore >= 75) return 'safe';
  if (safetyScore >= 50) return 'caution';
  if (safetyScore >= 30) return 'warning';
  return 'danger';
}

function generateSegmentHazards(
  zones: RiverZone[],
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null,
  stability: StabilityResult,
  buoyancy: BuoyancyResult,
  from: RoutePoint
): RouteHazard[] {
  const hazards: RouteHazard[] = [];

  for (const zone of zones) {
    if (zone.type === 'rapid') {
      hazards.push({
        id: `hazard-rapid-${hazards.length}`,
        type: 'rapid',
        severity: zone.baseFlowSpeed > 7 ? 'high' : 'medium',
        description: `进入急流区「${zone.name}」，水流速度 ${zone.baseFlowSpeed.toFixed(1)}m/s，需谨慎操控`,
        position: { x: from.x + 50, y: zone.y + zone.height / 2 },
      });
    }

    if (zone.type === 'torrent') {
      hazards.push({
        id: `hazard-torrent-${hazards.length}`,
        type: 'rapid',
        severity: 'critical',
        description: `进入洪峰区「${zone.name}」，水流速度 ${zone.baseFlowSpeed.toFixed(1)}m/s，极度危险！`,
        position: { x: from.x + 50, y: zone.y + zone.height / 2 },
      });
    }

    if (zone.type === 'obstacle') {
      hazards.push({
        id: `hazard-obstacle-${hazards.length}`,
        type: 'obstacle',
        severity: 'high',
        description: `进入障碍区「${zone.name}」，水中有暗礁和障碍物，需小心避让`,
        position: { x: from.x + 50, y: zone.y + zone.height / 2 },
      });
    }

    if (zone.type === 'shallow') {
      hazards.push({
        id: `hazard-shallow-${hazards.length}`,
        type: 'shallow',
        severity: buoyancy.draftDepth > 0.1 ? 'high' : 'medium',
        description: `进入浅滩区「${zone.name}」，水深较浅，吃水 ${buoyancy.draftDepth.toFixed(2)}m${buoyancy.draftDepth > 0.1 ? '，有搁浅风险' : ''}`,
        position: { x: from.x + 50, y: zone.y + zone.height / 2 },
      });
    }

    if (zone.type === 'narrows') {
      hazards.push({
        id: `hazard-narrows-${hazards.length}`,
        type: 'narrows',
        severity: 'medium',
        description: `进入狭窄航道「${zone.name}」，操控空间受限，需注意方向`,
        position: { x: from.x + 50, y: zone.y + zone.height / 2 },
      });
    }
  }

  if (weatherReport) {
    if (weatherReport.config.wind === 'strong') {
      hazards.push({
        id: `hazard-wind-${hazards.length}`,
        type: 'strong_wind',
        severity: 'critical',
        description: '当前强风天气，竹筏可能被吹翻，极度危险！',
        position: { x: from.x, y: from.y },
      });
    } else if (weatherReport.config.wind === 'windy') {
      hazards.push({
        id: `hazard-wind-${hazards.length}`,
        type: 'strong_wind',
        severity: 'medium',
        description: '当前大风天气，竹筏容易受横风影响',
        position: { x: from.x, y: from.y },
      });
    }

    if (weatherReport.effects.visibility < 0.5) {
      hazards.push({
        id: `hazard-visibility-${hazards.length}`,
        type: 'low_visibility',
        severity: 'high',
        description: `能见度仅 ${(weatherReport.effects.visibility * 100).toFixed(0)}%，严重影响航行安全`,
        position: { x: from.x, y: from.y },
      });
    }
  }

  if (buoyancy.isOverloaded) {
    hazards.push({
      id: `hazard-overload-${hazards.length}`,
      type: 'overload',
      severity: 'critical',
      description: `竹筏超载，载重比例 ${(buoyancy.loadRatio * 100).toFixed(1)}%，随时可能沉没`,
      position: { x: from.x, y: from.y },
    });
  } else if (buoyancy.loadRatio > 0.9) {
    hazards.push({
      id: `hazard-heavy-${hazards.length}`,
      type: 'overload',
      severity: 'high',
      description: `载重接近上限 (${(buoyancy.loadRatio * 100).toFixed(1)}%)，在复杂水域风险极高`,
      position: { x: from.x, y: from.y },
    });
  }

  if (stability.tiltRisk === 'high') {
    hazards.push({
      id: `hazard-tilt-${hazards.length}`,
      type: 'instability',
      severity: 'critical',
      description: '竹筏稳定性极差，倾覆风险极高',
      position: { x: from.x, y: from.y },
    });
  } else if (stability.tiltRisk === 'medium') {
    hazards.push({
      id: `hazard-tilt-${hazards.length}`,
      type: 'instability',
      severity: 'medium',
      description: '竹筏存在倾覆风险，在复杂水域需特别注意',
      position: { x: from.x, y: from.y },
    });
  }

  if (nightNavigationReport) {
    const timeLabel = TIME_OF_DAY_LABELS[nightNavigationReport.config.timeOfDay];

    if (nightNavigationReport.config.timeOfDay !== 'day') {
      if (!nightNavigationReport.canSailAtNight) {
        hazards.push({
          id: `hazard-night-${hazards.length}`,
          type: 'low_visibility',
          severity: 'critical',
          description: `${timeLabel}航行条件不足，不满足夜间出航标准，严禁出航！`,
          position: { x: from.x, y: from.y },
        });
      } else if (nightNavigationReport.visibility.overallVisibility < 0.3) {
        hazards.push({
          id: `hazard-night-${hazards.length}`,
          type: 'low_visibility',
          severity: 'high',
          description: `${timeLabel}能见度仅 ${(nightNavigationReport.visibility.overallVisibility * 100).toFixed(0)}%，视距受限，需减速慢行`,
          position: { x: from.x, y: from.y },
        });
      } else if (nightNavigationReport.visibility.overallVisibility < 0.6) {
        hazards.push({
          id: `hazard-night-${hazards.length}`,
          type: 'low_visibility',
          severity: 'medium',
          description: `${timeLabel}能见度一般 (${(nightNavigationReport.visibility.overallVisibility * 100).toFixed(0)}%)，请保持警惕`,
          position: { x: from.x, y: from.y },
        });
      }

      if (nightNavigationReport.obstacleRisk.collisionRisk === 'critical') {
        hazards.push({
          id: `hazard-night-collision-${hazards.length}`,
          type: 'obstacle',
          severity: 'critical',
          description: `${timeLabel}碰撞风险极高，障碍物探测概率极低，随时可能发生碰撞！`,
          position: { x: from.x, y: from.y },
        });
      } else if (nightNavigationReport.obstacleRisk.collisionRisk === 'high') {
        hazards.push({
          id: `hazard-night-collision-${hazards.length}`,
          type: 'obstacle',
          severity: 'high',
          description: `${timeLabel}碰撞风险较高，需加强瞭望，谨慎驾驶`,
          position: { x: from.x, y: from.y },
        });
      }

      if (nightNavigationReport.visibility.effectiveRange < 20) {
        hazards.push({
          id: `hazard-night-range-${hazards.length}`,
          type: 'low_visibility',
          severity: 'medium',
          description: `${timeLabel}有效视距仅 ${nightNavigationReport.visibility.effectiveRange.toFixed(0)} 米，反应时间不足，建议减速`,
          position: { x: from.x, y: from.y },
        });
      }
    }
  }

  return hazards;
}

function calculateSegment(
  from: RoutePoint,
  to: RoutePoint,
  zones: RiverZone[],
  config: RaftConfig,
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null
): RouteSegment {
  const intersectedZones = getZonesBetweenPoints(from, to, zones);
  const distance = calculateSegmentDistance(from, to);
  const flowSpeed = calculateSegmentFlowSpeed(intersectedZones, weatherReport, config.waterFlowSpeed);
  const safetyScore = calculateSegmentSafetyScore(intersectedZones, stability, buoyancy, weatherReport, nightNavigationReport);
  const riskLevel = determineRiskLevel(safetyScore);
  let effectiveSpeed = Math.max(0.5, flowSpeed * (1 - Math.max(0, buoyancy.loadRatio - 0.5) * 0.5));

  if (nightNavigationReport && nightNavigationReport.config.timeOfDay !== 'day') {
    const visibilityFactor = Math.max(0.3, nightNavigationReport.visibility.overallVisibility);
    effectiveSpeed *= visibilityFactor;
  }

  const estimatedTime = distance / effectiveSpeed * 60;
  const zoneTypes = [...new Set(intersectedZones.map((z) => z.type))];
  const hazards = generateSegmentHazards(intersectedZones, weatherReport, nightNavigationReport, stability, buoyancy, from);

  return {
    fromPointId: from.id,
    toPointId: to.id,
    distance,
    flowSpeed,
    safetyScore: Math.round(safetyScore),
    riskLevel,
    estimatedTime: Math.round(estimatedTime),
    zoneTypes,
    hazards,
  };
}

function buildRouteFromPoints(
  points: RoutePoint[],
  zones: RiverZone[],
  config: RaftConfig,
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null,
  name: string,
  description: string,
  tags: string[]
): RoutePlan {
  const segments: RouteSegment[] = [];
  const allHazards: RouteHazard[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const segment = calculateSegment(points[i], points[i + 1], zones, config, buoyancy, stability, weatherReport, nightNavigationReport);
    segments.push(segment);
    allHazards.push(...segment.hazards);
  }

  const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
  const totalEstimatedTime = segments.reduce((sum, s) => sum + s.estimatedTime, 0);
  const overallSafetyScore = Math.round(segments.reduce((sum, s) => sum + s.safetyScore, 0) / segments.length);

  const hasCriticalHazard = allHazards.some((h) => h.severity === 'critical');
  const overallRiskLevel: RiskLevel = overallSafetyScore >= 75 ? 'safe' : overallSafetyScore >= 50 ? 'caution' : overallSafetyScore >= 30 ? 'warning' : 'danger';

  const nightCannotSail = nightNavigationReport && !nightNavigationReport.canSailAtNight && nightNavigationReport.config.timeOfDay !== 'day';
  const isNotRecommended = hasCriticalHazard || overallSafetyScore < 30 || buoyancy.isOverloaded || !!nightCannotSail;

  if (isNotRecommended && !tags.includes(ROUTE_PLAN_TAGS.notRecommended)) {
    tags = [...tags, ROUTE_PLAN_TAGS.notRecommended];
  }

  const uniqueHazards = allHazards.filter(
    (h, i, arr) => arr.findIndex((x) => x.id === h.id) === i
  );

  return {
    id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    points: [...points],
    segments,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalEstimatedTime: Math.round(totalEstimatedTime),
    overallSafetyScore,
    overallRiskLevel,
    isNotRecommended,
    warnings: uniqueHazards,
    tags,
  };
}

function generateFastestRoute(
  points: RoutePoint[],
  zones: RiverZone[],
  config: RaftConfig,
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null
): RoutePlan {
  const directPoints: RoutePoint[] = points.map((p, i) => ({
    ...p,
    x: 100 + (i % 2 === 0 ? -5 : 5) * 2,
  }));

  return buildRouteFromPoints(
    directPoints,
    zones,
    config,
    buoyancy,
    stability,
    weatherReport,
    nightNavigationReport,
    '最快路线',
    '沿主航道直线行驶，距离最短但可能经过高风险区域',
    [ROUTE_PLAN_TAGS.fastest]
  );
}

function generateSafestRoute(
  points: RoutePoint[],
  zones: RiverZone[],
  config: RaftConfig,
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null
): RoutePlan {
  const safePoints: RoutePoint[] = points.map((p, i) => {
    const offset = i % 2 === 0 ? -35 : 35;
    return {
      ...p,
      x: Math.max(20, Math.min(180, p.x + offset)),
      name: i === 0 ? p.name : i === points.length - 1 ? p.name : `${p.name}(绕行)`,
    };
  });

  return buildRouteFromPoints(
    safePoints,
    zones,
    config,
    buoyancy,
    stability,
    weatherReport,
    nightNavigationReport,
    '最安全路线',
    '绕开急流和洪峰区域，选择沿岸平缓水域，距离较远但风险较低',
    [ROUTE_PLAN_TAGS.safest]
  );
}

function generateBalancedRoute(
  points: RoutePoint[],
  zones: RiverZone[],
  config: RaftConfig,
  buoyancy: BuoyancyResult,
  stability: StabilityResult,
  weatherReport: WeatherReport | null,
  nightNavigationReport: NightNavigationReport | null
): RoutePlan {
  const balancedPoints: RoutePoint[] = points.map((p, i) => {
    const offset = i % 2 === 0 ? -15 : 15;
    return {
      ...p,
      x: Math.max(30, Math.min(170, p.x + offset)),
      name: i === 0 ? p.name : i === points.length - 1 ? p.name : `${p.name}(优选)`,
    };
  });

  return buildRouteFromPoints(
    balancedPoints,
    zones,
    config,
    buoyancy,
    stability,
    weatherReport,
    nightNavigationReport,
    '均衡路线',
    '兼顾速度与安全，在可行范围内避开最高风险区域',
    [ROUTE_PLAN_TAGS.balanced]
  );
}

export function planRoutes(input: RoutePlanningInput): RoutePlanningResult {
  const { points, raftConfig, buoyancy, stability, weatherReport, nightNavigationReport, riverZones } = input;

  const hasStartEnd = points.some((p) => p.type === 'start') && points.some((p) => p.type === 'end');
  if (!hasStartEnd) {
    return {
      routes: [],
      recommendedRouteIndex: -1,
      riverZones,
    };
  }

  const sortedPoints = [...points].sort((a, b) => a.y - b.y);

  const fastest = generateFastestRoute(sortedPoints, riverZones, raftConfig, buoyancy, stability, weatherReport, nightNavigationReport);
  const safest = generateSafestRoute(sortedPoints, riverZones, raftConfig, buoyancy, stability, weatherReport, nightNavigationReport);
  const balanced = generateBalancedRoute(sortedPoints, riverZones, raftConfig, buoyancy, stability, weatherReport, nightNavigationReport);

  const routes = [balanced, safest, fastest];

  let recommendedRouteIndex = 0;
  const nonDangerous = routes
    .map((r, i) => ({ route: r, index: i }))
    .filter((r) => !r.route.isNotRecommended);

  if (nonDangerous.length > 0) {
    recommendedRouteIndex = nonDangerous.reduce((best, curr) =>
      curr.route.overallSafetyScore > best.route.overallSafetyScore ? curr : best
    ).index;
  }

  return {
    routes,
    recommendedRouteIndex,
    riverZones,
  };
}

export function getZoneAtPoint(x: number, y: number, zones: RiverZone[]): RiverZone | null {
  for (const zone of zones) {
    if (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    ) {
      return zone;
    }
  }
  return null;
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'safe': return '#40c057';
    case 'caution': return '#228be6';
    case 'warning': return '#fab005';
    case 'danger': return '#fa5252';
    default: return '#868e96';
  }
}

export function getSafetyScoreColor(score: number): string {
  if (score >= 75) return '#40c057';
  if (score >= 50) return '#228be6';
  if (score >= 30) return '#fab005';
  return '#fa5252';
}

export { RIVER_ZONE_FLOW_SPEEDS, RIVER_ZONE_RISK_SCORES };
