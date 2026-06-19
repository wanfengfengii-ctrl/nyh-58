import type { RaftConfig, Cargo, BuoyancyResult, StabilityResult, LoadingSuggestion } from '../types';
import { calculateRaftDimensions } from './raftGeometry';

function generateId(): string {
  return `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSideCargos(cargos: Cargo[], side: 'left' | 'right'): Cargo[] {
  return cargos.filter((c) => (side === 'left' ? c.x < 0 : c.x >= 0));
}

function getFrontBackCargos(cargos: Cargo[], side: 'front' | 'back'): Cargo[] {
  return cargos.filter((c) => (side === 'front' ? c.y < 0 : c.y >= 0));
}

function getHeaviestCargo(cargos: Cargo[]): Cargo | null {
  if (cargos.length === 0) return null;
  return cargos.reduce((heaviest, cargo) =>
    cargo.weight > heaviest.weight ? cargo : heaviest
  );
}

function getEdgeCargos(cargos: Cargo[], config: RaftConfig, threshold: number = 0.2): Cargo[] {
  const dims = calculateRaftDimensions(config);
  const edgeDistance = Math.min(dims.width, dims.height) * threshold;
  
  return cargos.filter((cargo) => {
    const halfW = cargo.width / 2;
    const halfH = cargo.height / 2;
    return (
      cargo.x - halfW - dims.left < edgeDistance ||
      dims.right - (cargo.x + halfW) < edgeDistance ||
      cargo.y - halfH - dims.top < edgeDistance ||
      dims.bottom - (cargo.y + halfH) < edgeDistance
    );
  });
}

function getOutOfBoundsCargos(cargos: Cargo[], config: RaftConfig): Cargo[] {
  return cargos.filter(
    (cargo) =>
      !isCargoWithinBounds(cargo.x, cargo.y, cargo.width, cargo.height, config)
  );
}

function isCargoWithinBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  config: RaftConfig
): boolean {
  const dims = calculateRaftDimensions(config);
  const halfW = width / 2;
  const halfH = height / 2;
  return (
    x - halfW >= dims.left &&
    x + halfW <= dims.right &&
    y - halfH >= dims.top &&
    y + halfH <= dims.bottom
  );
}

function calculateExpectedImprovement(
  type: LoadingSuggestion['type'],
  severity: number
): number {
  const baseImprovement: Record<LoadingSuggestion['type'], number> = {
    balance: 25,
    weight: 30,
    position: 15,
    add: 20,
    remove: 35,
  };
  return Math.min(100, Math.round(baseImprovement[type] * severity));
}

export function generateLoadingSuggestions(
  config: RaftConfig,
  cargos: Cargo[],
  buoyancy: BuoyancyResult,
  stability: StabilityResult
): LoadingSuggestion[] {
  const suggestions: LoadingSuggestion[] = [];
  const dims = calculateRaftDimensions(config);

  const leftCargos = getSideCargos(cargos, 'left');
  const rightCargos = getSideCargos(cargos, 'right');
  const frontCargos = getFrontBackCargos(cargos, 'front');
  const backCargos = getFrontBackCargos(cargos, 'back');

  const leftWeight = leftCargos.reduce((sum, c) => sum + c.weight, 0);
  const rightWeight = rightCargos.reduce((sum, c) => sum + c.weight, 0);
  const frontWeight = frontCargos.reduce((sum, c) => sum + c.weight, 0);
  const backWeight = backCargos.reduce((sum, c) => sum + c.weight, 0);

  const totalCargoWeight = leftWeight + rightWeight;
  const leftRightDiff = Math.abs(leftWeight - rightWeight);
  const frontBackDiff = Math.abs(frontWeight - backWeight);

  if (totalCargoWeight > 0) {
    const leftRightRatio = leftRightDiff / totalCargoWeight;
    
    if (leftRightRatio > 0.15) {
      const isLeftHeavier = leftWeight > rightWeight;
      const heavySideCargos = isLeftHeavier ? leftCargos : rightCargos;
      const heaviest = getHeaviestCargo(heavySideCargos);
      
      if (heaviest) {
        const targetX = isLeftHeavier
          ? Math.max(0, heaviest.x + dims.width * 0.3)
          : Math.min(0, heaviest.x - dims.width * 0.3);
        
        suggestions.push({
          id: generateId(),
          type: 'balance',
          cargoId: heaviest.id,
          fromX: heaviest.x,
          fromY: heaviest.y,
          toX: targetX,
          toY: heaviest.y,
          title: '平衡左右重量',
          description: `左侧重量 ${leftWeight.toFixed(1)}kg，右侧重量 ${rightWeight.toFixed(1)}kg，建议将「${heaviest.name}」移到${isLeftHeavier ? '右' : '左'}侧以改善平衡。`,
          priority: leftRightRatio > 0.3 ? 'high' : 'medium',
          expectedImprovement: calculateExpectedImprovement('balance', Math.min(leftRightRatio * 2, 1)),
        });
      }
    }

    const frontBackRatio = frontBackDiff / totalCargoWeight;
    
    if (frontBackRatio > 0.2) {
      const isFrontHeavier = frontWeight > backWeight;
      const heavySideCargos = isFrontHeavier ? frontCargos : backCargos;
      const heaviest = getHeaviestCargo(heavySideCargos);
      
      if (heaviest) {
        const targetY = isFrontHeavier
          ? Math.max(0, heaviest.y + dims.height * 0.25)
          : Math.min(0, heaviest.y - dims.height * 0.25);
        
        suggestions.push({
          id: generateId(),
          type: 'balance',
          cargoId: heaviest.id,
          fromX: heaviest.x,
          fromY: heaviest.y,
          toX: heaviest.x,
          toY: targetY,
          title: '平衡前后重量',
          description: `前部重量 ${frontWeight.toFixed(1)}kg，后部重量 ${backWeight.toFixed(1)}kg，建议将「${heaviest.name}」向${isFrontHeavier ? '后' : '前'}移动。`,
          priority: frontBackRatio > 0.35 ? 'high' : 'medium',
          expectedImprovement: calculateExpectedImprovement('balance', Math.min(frontBackRatio * 1.5, 1)),
        });
      }
    }
  }

  if (buoyancy.isOverloaded) {
    const heaviest = getHeaviestCargo(cargos);
    if (heaviest) {
      const excessWeight = buoyancy.totalWeight - buoyancy.totalBuoyancy;
      suggestions.push({
        id: generateId(),
        type: 'weight',
        cargoId: heaviest.id,
        title: '超载警告：移除最重货物',
        description: `当前载重 ${buoyancy.totalWeight.toFixed(1)}kg 超过最大浮力 ${buoyancy.totalBuoyancy.toFixed(1)}kg，超载 ${excessWeight.toFixed(1)}kg。建议移除「${heaviest.name}」(${heaviest.weight}kg)。`,
        priority: 'high',
        expectedImprovement: calculateExpectedImprovement('weight', Math.min(excessWeight / heaviest.weight, 1)),
      });
    }
  }

  if (buoyancy.loadRatio > 0.85 && !buoyancy.isOverloaded) {
    suggestions.push({
      id: generateId(),
      type: 'add',
      title: '增加竹筒提升浮力',
      description: `当前载重比例已达 ${(buoyancy.loadRatio * 100).toFixed(1)}%，接近安全上限。建议增加竹筒数量或增大竹筒直径以提升浮力储备。`,
      priority: buoyancy.loadRatio > 0.95 ? 'high' : 'medium',
      expectedImprovement: calculateExpectedImprovement('add', Math.min((buoyancy.loadRatio - 0.85) * 3, 1)),
    });
  }

  if (Math.abs(stability.leftRightBalance) > 0.4) {
    const heaviest = getHeaviestCargo(cargos);
    if (heaviest) {
      suggestions.push({
        id: generateId(),
        type: 'remove',
        cargoId: heaviest.id,
        title: '重心严重偏移：移除货物',
        description: `重心偏移严重，左右平衡值 ${stability.leftRightBalance.toFixed(3)} 已超过安全范围 0.4。建议移除「${heaviest.name}」以恢复平衡。`,
        priority: 'high',
        expectedImprovement: calculateExpectedImprovement('remove', Math.min(Math.abs(stability.leftRightBalance), 1)),
      });
    }
  }

  const outOfBoundsCargos = getOutOfBoundsCargos(cargos, config);
  for (const cargo of outOfBoundsCargos) {
    const dims = calculateRaftDimensions(config);
    const halfW = cargo.width / 2;
    const halfH = cargo.height / 2;
    
    let toX = cargo.x;
    let toY = cargo.y;
    
    if (cargo.x - halfW < dims.left) toX = dims.left + halfW;
    if (cargo.x + halfW > dims.right) toX = dims.right - halfW;
    if (cargo.y - halfH < dims.top) toY = dims.top + halfH;
    if (cargo.y + halfH > dims.bottom) toY = dims.bottom - halfH;
    
    suggestions.push({
      id: generateId(),
      type: 'position',
      cargoId: cargo.id,
      fromX: cargo.x,
      fromY: cargo.y,
      toX,
      toY,
      title: '货物超出竹筏边界',
      description: `「${cargo.name}」位于竹筏边界之外，请将其移回竹筏范围内。`,
      priority: 'high',
      expectedImprovement: calculateExpectedImprovement('position', 0.9),
    });
  }

  const edgeCargos = getEdgeCargos(cargos, config, 0.15);
  for (const cargo of edgeCargos.slice(0, 3)) {
    const dims = calculateRaftDimensions(config);
    const halfW = cargo.width / 2;
    const halfH = cargo.height / 2;
    
    let toX = cargo.x;
    let toY = cargo.y;
    
    if (cargo.x < 0) {
      toX = Math.min(cargo.x + dims.width * 0.15, -halfW - 5);
    } else {
      toX = Math.max(cargo.x - dims.width * 0.15, halfW + 5);
    }
    if (cargo.y < 0) {
      toY = Math.min(cargo.y + dims.height * 0.1, -halfH - 5);
    } else {
      toY = Math.max(cargo.y - dims.height * 0.1, halfH + 5);
    }
    
    suggestions.push({
      id: generateId(),
      type: 'position',
      cargoId: cargo.id,
      fromX: cargo.x,
      fromY: cargo.y,
      toX,
      toY,
      title: '货物靠近边缘',
      description: `「${cargo.name}」靠近竹筏边缘，建议向内侧移动以降低侧翻风险。`,
      priority: 'low',
      expectedImprovement: calculateExpectedImprovement('position', 0.4),
    });
  }

  const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  suggestions.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.expectedImprovement - a.expectedImprovement;
  });

  return suggestions;
}
