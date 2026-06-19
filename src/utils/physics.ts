import type { RaftConfig, Cargo, BuoyancyResult, StabilityResult, CenterOfGravity } from '../types';
import { calculateRaftVolume, calculateRaftWeight, calculateRaftDimensions } from './raftGeometry';

const GRAVITY = 9.81;

export function calculateBuoyancy(
  config: RaftConfig,
  cargos: Cargo[]
): BuoyancyResult {
  const { waterDensity } = config;
  
  const totalVolume = calculateRaftVolume(config);
  const maxBuoyancy = totalVolume * waterDensity * GRAVITY;
  
  const raftWeight = calculateRaftWeight(config);
  const cargoWeight = cargos.reduce((sum, c) => sum + c.weight, 0);
  const totalWeight = raftWeight + cargoWeight;
  
  const displacement = totalWeight / (waterDensity * GRAVITY);
  const loadRatio = totalWeight / maxBuoyancy;
  const isOverloaded = totalWeight > maxBuoyancy;
  
  const draftDepth = calculateDraftDepth(config, displacement);
  
  return {
    totalBuoyancy: maxBuoyancy,
    totalWeight,
    draftDepth,
    displacement,
    isOverloaded,
    loadRatio,
  };
}

function calculateDraftDepth(config: RaftConfig, displacement: number): number {
  const { tubeCount, tubeDiameter, tubeLength } = config;
  
  const radius = tubeDiameter / 2;
  const totalCrossSection = displacement / tubeLength;
  const perTubeArea = totalCrossSection / tubeCount;
  
  if (perTubeArea >= Math.PI * radius * radius) {
    return tubeDiameter;
  }
  
  const ratio = perTubeArea / (Math.PI * radius * radius);
  return tubeDiameter * ratio;
}

export function calculateCenterOfGravity(
  config: RaftConfig,
  cargos: Cargo[]
): CenterOfGravity {
  const raftWeight = calculateRaftWeight(config);
  
  let totalWeight = raftWeight;
  let weightedX = 0;
  let weightedY = 0;
  
  for (const cargo of cargos) {
    totalWeight += cargo.weight;
    weightedX += cargo.x * cargo.weight;
    weightedY += cargo.y * cargo.weight;
  }
  
  return {
    x: weightedX / totalWeight,
    y: weightedY / totalWeight,
    totalWeight,
  };
}

export function calculateStability(
  config: RaftConfig,
  cargos: Cargo[],
  buoyancy: BuoyancyResult
): StabilityResult {
  const dims = calculateRaftDimensions(config);
  const cog = calculateCenterOfGravity(config, cargos);
  
  const centerX = 0;
  const centerY = 0;
  
  const halfWidth = dims.width / 2;
  const halfHeight = dims.height / 2;
  
  const leftWeight = calculateSideWeight(config, cargos, 'left');
  const rightWeight = calculateSideWeight(config, cargos, 'right');
  
  const leftRightBalance = halfWidth > 0 ? (cog.x - centerX) / halfWidth : 0;
  const frontBackBalance = halfHeight > 0 ? (cog.y - centerY) / halfHeight : 0;
  
  const offsetDistance = Math.sqrt(
    leftRightBalance * leftRightBalance + frontBackBalance * frontBackBalance
  );
  
  let stabilityScore = Math.max(0, 100 - offsetDistance * 150);
  
  if (buoyancy.isOverloaded) {
    stabilityScore = Math.min(stabilityScore, 30);
  }
  
  const flowFactor = Math.min(config.waterFlowSpeed / 5, 1);
  stabilityScore -= flowFactor * 15;
  stabilityScore = Math.max(0, Math.min(100, stabilityScore));
  
  let tiltRisk: 'low' | 'medium' | 'high' = 'low';
  if (Math.abs(leftRightBalance) > 0.3 || stabilityScore < 60) {
    tiltRisk = 'medium';
  }
  if (Math.abs(leftRightBalance) > 0.5 || stabilityScore < 35) {
    tiltRisk = 'high';
  }
  
  const isSailable = 
    !buoyancy.isOverloaded &&
    stabilityScore >= 40 &&
    Math.abs(leftRightBalance) <= 0.45;
  
  return {
    stabilityScore,
    tiltRisk,
    leftRightBalance,
    frontBackBalance,
    cogX: cog.x,
    cogY: cog.y,
    centerX,
    centerY,
    leftWeight,
    rightWeight,
    isSailable,
  };
}

function calculateSideWeight(
  config: RaftConfig,
  cargos: Cargo[],
  side: 'left' | 'right'
): number {
  const raftWeight = calculateRaftWeight(config);
  let weight = raftWeight / 2;
  
  for (const cargo of cargos) {
    if (side === 'left' && cargo.x < 0) {
      weight += cargo.weight;
    } else if (side === 'right' && cargo.x >= 0) {
      weight += cargo.weight;
    }
  }
  
  return weight;
}

export function validateConfig(config: RaftConfig): string[] {
  const errors: string[] = [];
  
  if (config.tubeCount <= 0) {
    errors.push('竹筒数量必须大于 0');
  }
  if (config.tubeDiameter <= 0) {
    errors.push('竹筒直径必须大于 0');
  }
  if (config.tubeLength <= 0) {
    errors.push('竹筒长度必须大于 0');
  }
  if (config.tubeSpacing < 0) {
    errors.push('竹筒间距不能为负数');
  }
  if (config.waterFlowSpeed <= 0) {
    errors.push('水流速度必须大于 0');
  }
  if (config.waterDensity <= 0) {
    errors.push('水的密度必须大于 0');
  }
  if (config.tubeDensity <= 0) {
    errors.push('竹子密度必须大于 0');
  }
  
  return errors;
}

export function validateCargos(cargos: Cargo[]): string[] {
  const errors: string[] = [];
  
  for (const cargo of cargos) {
    if (cargo.weight <= 0) {
      errors.push(`货物 ${cargo.name} 的重量必须大于 0`);
    }
    if (cargo.width <= 0 || cargo.height <= 0) {
      errors.push(`货物 ${cargo.name} 的尺寸必须大于 0`);
    }
  }
  
  return errors;
}
