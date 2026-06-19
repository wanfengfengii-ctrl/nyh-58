import { describe, it, expect } from 'vitest';
import {
  calculateBuoyancy,
  calculateStability,
  calculateCenterOfGravity,
  validateConfig,
  validateCargos,
} from '../physics';
import {
  isCargoWithinBounds,
  clampCargoToBounds,
  areAllCargosWithinBounds,
  clampAllCargosToBounds,
  getOutOfBoundsCargos,
  calculateRaftVolume,
  calculateRaftWeight,
  calculateRaftDimensions,
} from '../raftGeometry';
import { DEFAULT_CONFIG } from '../../constants';
import type { RaftConfig, Cargo } from '../../types';

describe('浮力计算', () => {
  it('空筏的浮力计算正确', () => {
    const result = calculateBuoyancy(DEFAULT_CONFIG, []);
    const raftWeight = calculateRaftWeight(DEFAULT_CONFIG);
    expect(result.totalWeight).toBeCloseTo(raftWeight);
    expect(result.totalBuoyancy).toBeGreaterThan(0);
    expect(result.isOverloaded).toBe(false);
    expect(result.loadRatio).toBeGreaterThan(0);
    expect(result.loadRatio).toBeLessThan(1);
  });

  it('加载货物后的总重量计算正确', () => {
    const cargos: Cargo[] = [
      { id: '1', name: '货物1', x: 0, y: 0, width: 0.5, height: 0.5, weight: 500, color: '#fff' },
      { id: '2', name: '货物2', x: 0.5, y: 0, width: 0.5, height: 0.5, weight: 300, color: '#fff' },
    ];
    const result = calculateBuoyancy(DEFAULT_CONFIG, cargos);
    const raftWeight = calculateRaftWeight(DEFAULT_CONFIG);
    expect(result.totalWeight).toBeCloseTo(raftWeight + 800);
  });

  it('超载时 isOverloaded 为 true', () => {
    const heavyCargo: Cargo[] = [
      { id: '1', name: '重物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100000, color: '#fff' },
    ];
    const result = calculateBuoyancy(DEFAULT_CONFIG, heavyCargo);
    expect(result.isOverloaded).toBe(true);
    expect(result.loadRatio).toBeGreaterThan(1);
  });

  it('未超载时 isOverloaded 为 false', () => {
    const lightCargo: Cargo[] = [
      { id: '1', name: '轻物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    const result = calculateBuoyancy(DEFAULT_CONFIG, lightCargo);
    expect(result.isOverloaded).toBe(false);
    expect(result.loadRatio).toBeLessThan(1);
  });

  it('吃水深度随载重增加而增加', () => {
    const emptyResult = calculateBuoyancy(DEFAULT_CONFIG, []);
    const lightCargo: Cargo[] = [
      { id: '1', name: '轻物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 200, color: '#fff' },
    ];
    const lightResult = calculateBuoyancy(DEFAULT_CONFIG, lightCargo);
    const heavyCargo: Cargo[] = [
      { id: '1', name: '重物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 600, color: '#fff' },
    ];
    const heavyResult = calculateBuoyancy(DEFAULT_CONFIG, heavyCargo);

    expect(lightResult.draftDepth).toBeGreaterThan(emptyResult.draftDepth);
    expect(heavyResult.draftDepth).toBeGreaterThan(lightResult.draftDepth);
  });

  it('载重比例计算正确', () => {
    const result = calculateBuoyancy(DEFAULT_CONFIG, []);
    const expectedRatio = result.totalWeight / result.totalBuoyancy;
    expect(result.loadRatio).toBeCloseTo(expectedRatio);
    expect(result.loadRatio).toBeGreaterThan(0);
  });
});

describe('稳定性计算', () => {
  it('对称装载时稳定性评分高', () => {
    const symmetricCargos: Cargo[] = [
      { id: '1', name: '左货', x: -0.5, y: 0, width: 0.5, height: 0.5, weight: 200, color: '#fff' },
      { id: '2', name: '右货', x: 0.5, y: 0, width: 0.5, height: 0.5, weight: 200, color: '#fff' },
    ];
    const buoyancy = calculateBuoyancy(DEFAULT_CONFIG, symmetricCargos);
    const result = calculateStability(DEFAULT_CONFIG, symmetricCargos, buoyancy);
    expect(result.stabilityScore).toBeGreaterThan(70);
    expect(result.tiltRisk).toBe('low');
  });

  it('严重偏载时稳定性评分低，倾斜风险为 high', () => {
    const unbalancedCargos: Cargo[] = [
      { id: '1', name: '左货', x: -0.7, y: 0, width: 0.5, height: 0.5, weight: 5000, color: '#fff' },
    ];
    const buoyancy = calculateBuoyancy(DEFAULT_CONFIG, unbalancedCargos);
    const result = calculateStability(DEFAULT_CONFIG, unbalancedCargos, buoyancy);
    expect(Math.abs(result.leftRightBalance)).toBeGreaterThan(0.5);
    expect(result.tiltRisk).toBe('high');
  });

  it('超载时稳定性评分被限制在 30 以下', () => {
    const heavyCargo: Cargo[] = [
      { id: '1', name: '重物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100000, color: '#fff' },
    ];
    const buoyancy = calculateBuoyancy(DEFAULT_CONFIG, heavyCargo);
    const result = calculateStability(DEFAULT_CONFIG, heavyCargo, buoyancy);
    expect(buoyancy.isOverloaded).toBe(true);
    expect(result.stabilityScore).toBeLessThanOrEqual(30);
  });

  it('水流速度越高稳定性评分越低', () => {
    const cargos: Cargo[] = [
      { id: '1', name: '货物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 200, color: '#fff' },
    ];
    const slowConfig: RaftConfig = { ...DEFAULT_CONFIG, waterFlowSpeed: 0.5 };
    const fastConfig: RaftConfig = { ...DEFAULT_CONFIG, waterFlowSpeed: 5 };

    const buoyancySlow = calculateBuoyancy(slowConfig, cargos);
    const resultSlow = calculateStability(slowConfig, cargos, buoyancySlow);

    const buoyancyFast = calculateBuoyancy(fastConfig, cargos);
    const resultFast = calculateStability(fastConfig, cargos, buoyancyFast);

    expect(resultFast.stabilityScore).toBeLessThan(resultSlow.stabilityScore);
  });

  it('可出航条件判断正确', () => {
    const goodCargos: Cargo[] = [
      { id: '1', name: '货物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    const badCargos: Cargo[] = [
      { id: '1', name: '重物', x: -1, y: 0, width: 0.5, height: 0.5, weight: 100000, color: '#fff' },
    ];

    const buoyancyGood = calculateBuoyancy(DEFAULT_CONFIG, goodCargos);
    const resultGood = calculateStability(DEFAULT_CONFIG, goodCargos, buoyancyGood);
    expect(resultGood.isSailable).toBe(true);

    const buoyancyBad = calculateBuoyancy(DEFAULT_CONFIG, badCargos);
    const resultBad = calculateStability(DEFAULT_CONFIG, badCargos, buoyancyBad);
    expect(resultBad.isSailable).toBe(false);
  });
});

describe('重心计算', () => {
  it('空筏重心在中心', () => {
    const result = calculateCenterOfGravity(DEFAULT_CONFIG, []);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('偏载货物时重心偏移方向正确', () => {
    const leftCargo: Cargo[] = [
      { id: '1', name: '左货', x: -1, y: 0, width: 0.5, height: 0.5, weight: 300, color: '#fff' },
    ];
    const resultLeft = calculateCenterOfGravity(DEFAULT_CONFIG, leftCargo);
    expect(resultLeft.x).toBeLessThan(0);

    const rightCargo: Cargo[] = [
      { id: '1', name: '右货', x: 1, y: 0, width: 0.5, height: 0.5, weight: 300, color: '#fff' },
    ];
    const resultRight = calculateCenterOfGravity(DEFAULT_CONFIG, rightCargo);
    expect(resultRight.x).toBeGreaterThan(0);
  });

  it('总重量计算正确（竹筏自重 + 货物重量）', () => {
    const cargos: Cargo[] = [
      { id: '1', name: '货物1', x: 0, y: 0, width: 0.5, height: 0.5, weight: 200, color: '#fff' },
      { id: '2', name: '货物2', x: 0.5, y: 0, width: 0.5, height: 0.5, weight: 300, color: '#fff' },
    ];
    const raftWeight = calculateRaftWeight(DEFAULT_CONFIG);
    const result = calculateCenterOfGravity(DEFAULT_CONFIG, cargos);
    expect(result.totalWeight).toBeCloseTo(raftWeight + 500);
  });
});

describe('越界约束', () => {
  it('isCargoWithinBounds: 边界内返回 true，越界返回 false', () => {
    expect(isCargoWithinBounds(0, 0, 0.5, 0.5, DEFAULT_CONFIG)).toBe(true);
    expect(isCargoWithinBounds(10, 0, 0.5, 0.5, DEFAULT_CONFIG)).toBe(false);
    expect(isCargoWithinBounds(-10, 0, 0.5, 0.5, DEFAULT_CONFIG)).toBe(false);
    expect(isCargoWithinBounds(0, 10, 0.5, 0.5, DEFAULT_CONFIG)).toBe(false);
    expect(isCargoWithinBounds(0, -10, 0.5, 0.5, DEFAULT_CONFIG)).toBe(false);
  });

  it('clampCargoToBounds: 正确将货物限制在边界内', () => {
    const dims = calculateRaftDimensions(DEFAULT_CONFIG);
    const halfW = 0.25;
    const halfH = 0.25;

    const clampedRight = clampCargoToBounds(10, 0, 0.5, 0.5, DEFAULT_CONFIG);
    expect(clampedRight.x).toBeCloseTo(dims.right - halfW);
    expect(clampedRight.y).toBeCloseTo(0);

    const clampedLeft = clampCargoToBounds(-10, 0, 0.5, 0.5, DEFAULT_CONFIG);
    expect(clampedLeft.x).toBeCloseTo(dims.left + halfW);
    expect(clampedLeft.y).toBeCloseTo(0);

    const clampedBottom = clampCargoToBounds(0, 10, 0.5, 0.5, DEFAULT_CONFIG);
    expect(clampedBottom.x).toBeCloseTo(0);
    expect(clampedBottom.y).toBeCloseTo(dims.bottom - halfH);

    const clampedTop = clampCargoToBounds(0, -10, 0.5, 0.5, DEFAULT_CONFIG);
    expect(clampedTop.x).toBeCloseTo(0);
    expect(clampedTop.y).toBeCloseTo(dims.top + halfH);
  });

  it('areAllCargosWithinBounds: 所有货物在边界内返回 true', () => {
    const goodCargos: Cargo[] = [
      { id: '1', name: '货物1', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
      { id: '2', name: '货物2', x: 0.5, y: 0.5, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    expect(areAllCargosWithinBounds(goodCargos, DEFAULT_CONFIG)).toBe(true);

    const badCargos: Cargo[] = [
      { id: '1', name: '货物1', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
      { id: '2', name: '货物2', x: 10, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    expect(areAllCargosWithinBounds(badCargos, DEFAULT_CONFIG)).toBe(false);
  });

  it('clampAllCargosToBounds: 正确限制所有货物', () => {
    const dims = calculateRaftDimensions(DEFAULT_CONFIG);
    const cargos: Cargo[] = [
      { id: '1', name: '货物1', x: 10, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
      { id: '2', name: '货物2', x: -10, y: 10, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    const clamped = clampAllCargosToBounds(cargos, DEFAULT_CONFIG);
    expect(clamped[0].x).toBeLessThanOrEqual(dims.right);
    expect(clamped[0].x).toBeGreaterThanOrEqual(dims.left);
    expect(clamped[1].x).toBeLessThanOrEqual(dims.right);
    expect(clamped[1].x).toBeGreaterThanOrEqual(dims.left);
    expect(clamped[1].y).toBeLessThanOrEqual(dims.bottom);
    expect(clamped[1].y).toBeGreaterThanOrEqual(dims.top);
  });

  it('getOutOfBoundsCargos: 正确返回越界货物名称', () => {
    const cargos: Cargo[] = [
      { id: '1', name: '正常货物', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
      { id: '2', name: '越界货物A', x: 10, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
      { id: '3', name: '越界货物B', x: 0, y: -10, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    const outOfBounds = getOutOfBoundsCargos(cargos, DEFAULT_CONFIG);
    expect(outOfBounds).toHaveLength(2);
    expect(outOfBounds).toContain('越界货物A');
    expect(outOfBounds).toContain('越界货物B');
    expect(outOfBounds).not.toContain('正常货物');
  });
});

describe('几何计算', () => {
  it('calculateRaftDimensions: 宽度和高度计算正确', () => {
    const dims = calculateRaftDimensions(DEFAULT_CONFIG);
    const expectedWidth = DEFAULT_CONFIG.tubeCount * DEFAULT_CONFIG.tubeDiameter +
      (DEFAULT_CONFIG.tubeCount - 1) * DEFAULT_CONFIG.tubeSpacing;
    const expectedHeight = DEFAULT_CONFIG.tubeLength;

    expect(dims.width).toBeCloseTo(expectedWidth);
    expect(dims.height).toBeCloseTo(expectedHeight);
    expect(dims.left).toBeCloseTo(-expectedWidth / 2);
    expect(dims.right).toBeCloseTo(expectedWidth / 2);
    expect(dims.top).toBeCloseTo(-expectedHeight / 2);
    expect(dims.bottom).toBeCloseTo(expectedHeight / 2);
  });

  it('calculateRaftVolume: 体积计算正确', () => {
    const volume = calculateRaftVolume(DEFAULT_CONFIG);
    const radius = DEFAULT_CONFIG.tubeDiameter / 2;
    const singleTubeVolume = Math.PI * radius * radius * DEFAULT_CONFIG.tubeLength;
    const expectedVolume = singleTubeVolume * DEFAULT_CONFIG.tubeCount;

    expect(volume).toBeCloseTo(expectedVolume);
    expect(volume).toBeGreaterThan(0);
  });

  it('calculateRaftWeight: 重量计算正确', () => {
    const weight = calculateRaftWeight(DEFAULT_CONFIG);
    const volume = calculateRaftVolume(DEFAULT_CONFIG);
    const expectedWeight = volume * DEFAULT_CONFIG.tubeDensity * 9.81;

    expect(weight).toBeCloseTo(expectedWeight);
    expect(weight).toBeGreaterThan(0);
  });
});

describe('验证函数', () => {
  it('validateConfig: 无效参数返回错误', () => {
    const goodConfig: RaftConfig = { ...DEFAULT_CONFIG };
    expect(validateConfig(goodConfig)).toHaveLength(0);

    const badConfig1: RaftConfig = { ...DEFAULT_CONFIG, tubeCount: 0 };
    expect(validateConfig(badConfig1)).toContain('竹筒数量必须大于 0');

    const badConfig2: RaftConfig = { ...DEFAULT_CONFIG, tubeDiameter: -1 };
    expect(validateConfig(badConfig2)).toContain('竹筒直径必须大于 0');

    const badConfig3: RaftConfig = { ...DEFAULT_CONFIG, tubeLength: -1 };
    expect(validateConfig(badConfig3)).toContain('竹筒长度必须大于 0');

    const badConfig4: RaftConfig = { ...DEFAULT_CONFIG, tubeSpacing: -1 };
    expect(validateConfig(badConfig4)).toContain('竹筒间距不能为负数');

    const badConfig5: RaftConfig = { ...DEFAULT_CONFIG, waterDensity: 0 };
    expect(validateConfig(badConfig5)).toContain('水的密度必须大于 0');

    const badConfig6: RaftConfig = { ...DEFAULT_CONFIG, tubeDensity: 0 };
    expect(validateConfig(badConfig6)).toContain('竹子密度必须大于 0');
  });

  it('validateCargos: 无效货物参数返回错误', () => {
    const goodCargos: Cargo[] = [
      { id: '1', name: '货物1', x: 0, y: 0, width: 0.5, height: 0.5, weight: 100, color: '#fff' },
    ];
    expect(validateCargos(goodCargos)).toHaveLength(0);

    const badCargos1: Cargo[] = [
      { id: '1', name: '坏货物', x: 0, y: 0, width: 0.5, height: 0.5, weight: -10, color: '#fff' },
    ];
    expect(validateCargos(badCargos1)).toContain('货物 坏货物 的重量必须大于 0');

    const badCargos2: Cargo[] = [
      { id: '1', name: '坏货物', x: 0, y: 0, width: 0, height: 0.5, weight: 100, color: '#fff' },
    ];
    expect(validateCargos(badCargos2)).toContain('货物 坏货物 的尺寸必须大于 0');

    const badCargos3: Cargo[] = [
      { id: '1', name: '坏货物', x: 0, y: 0, width: 0.5, height: -1, weight: 100, color: '#fff' },
    ];
    expect(validateCargos(badCargos3)).toContain('货物 坏货物 的尺寸必须大于 0');
  });
});
