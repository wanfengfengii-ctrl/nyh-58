import type { RaftConfig, Cargo } from '../types';

export const DEFAULT_CONFIG: RaftConfig = {
  tubeCount: 8,
  tubeDiameter: 0.15,
  tubeLength: 6,
  tubeSpacing: 0.05,
  tubeDensity: 350,
  waterDensity: 1000,
  waterFlowSpeed: 1.5,
};

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
