import React, { useRef, useMemo, useState } from 'react';
import type { RaftConfig, Cargo } from '../types';
import { calculateRaftDimensions, generateBambooTubes } from '../utils/raftGeometry';

interface RaftSideViewProps {
  config: RaftConfig;
  cargos: Cargo[];
  draftDepth: number;
  raftAngle?: number;
  waterLevel?: number;
  physicsRunning?: boolean;
}

const SCALE = 80;
const PADDING = 60;
const WAVE_AMPLITUDE = 0.03;
const WAVE_LENGTH = 0.4;

export const RaftSideView: React.FC<RaftSideViewProps> = ({
  config,
  cargos,
  draftDepth,
  raftAngle = 0,
  waterLevel = 0,
  physicsRunning = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [wavePhase] = useState(() => Math.random() * Math.PI * 2);

  const dims = useMemo(() => calculateRaftDimensions(config), [config]);
  const tubes = useMemo(() => generateBambooTubes(config), [config]);

  const svgWidth = dims.width * SCALE + PADDING * 2;
  const svgHeight = (config.tubeDiameter * 3 + draftDepth + 0.5) * SCALE + PADDING * 2;

  const centerX = svgWidth / 2;
  const raftBaseY = svgHeight - PADDING - config.tubeDiameter * SCALE * 0.5;

  const toSvgX = (x: number) => PADDING + (x - dims.left) * SCALE;

  const tubeRadius = (config.tubeDiameter * SCALE) / 2;
  const draftDepthPixels = draftDepth * SCALE;

  const generateWavePath = (baseY: number, amplitude: number, phase: number) => {
    const points: string[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * svgWidth;
      const waveX = (x / svgWidth) * dims.width;
      const angleOffset = waveX * Math.tan(raftAngle);
      const waveY = baseY + angleOffset + Math.sin((waveX / WAVE_LENGTH) * Math.PI * 2 + phase) * amplitude;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${waveY.toFixed(2)}`);
    }
    return points.join(' ');
  };

  const waterSurfaceY = raftBaseY + tubeRadius - draftDepthPixels + waterLevel * SCALE;
  const waveAmplitudePixels = WAVE_AMPLITUDE * SCALE;

  const tubeCenterY = raftBaseY;

  const renderTube = (tube: import('../types').BambooTube, index: number) => {
    const cx = toSvgX(tube.x);
    const cy = tubeCenterY;
    const r = tubeRadius;

    const waterYAtTube = waterSurfaceY + (cx - centerX) * Math.tan(raftAngle);

    const submergedHeight = waterYAtTube - (cy - r);
    const submergedRatio = Math.max(0, Math.min(1, submergedHeight / (2 * r)));

    const fillColor = index % 2 === 0 ? '#d4b86a' : '#c9ad5f';

    return (
      <g key={tube.id}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fillColor}
          stroke="#8b7355"
          strokeWidth={2}
        />
        {submergedRatio > 0 && (
          <path
            d={`M ${cx - r} ${cy + r} 
                A ${r} ${r} 0 0 0 ${cx + r} ${cy + r}
                L ${cx + r} ${waterYAtTube}
                A ${r} ${r} 0 0 1 ${cx - r} ${waterYAtTube}
                Z`}
            fill="rgba(52, 152, 219, 0.4)"
            stroke="rgba(41, 128, 185, 0.6)"
            strokeWidth={1}
          />
        )}
        <line
          x1={cx - r * 0.5}
          y1={cy - r * 0.3}
          x2={cx - r * 0.5}
          y2={cy - r * 0.1}
          stroke="#8b7355"
          strokeWidth={1}
        />
        <line
          x1={cx + r * 0.4}
          y1={cy + r * 0.2}
          x2={cx + r * 0.4}
          y2={cy + r * 0.4}
          stroke="#8b7355"
          strokeWidth={1}
        />
      </g>
    );
  };

  const renderCargo = (cargo: Cargo) => {
    const cx = toSvgX(cargo.x);
    const cargoBottomY = raftBaseY - tubeRadius - cargo.y * SCALE;
    const cargoHeight = cargo.height * SCALE;
    const cargoWidth = cargo.width * SCALE;

    const offsetY = (cx - centerX) * Math.tan(raftAngle);
    const y = cargoBottomY + offsetY;

    return (
      <g key={cargo.id}>
        <rect
          x={cx - cargoWidth / 2}
          y={y - cargoHeight}
          width={cargoWidth}
          height={cargoHeight}
          fill={cargo.color}
          stroke="#1a1a1a"
          strokeWidth={1.5}
          rx={3}
        />
        <text
          x={cx}
          y={y - cargoHeight / 2 - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={10}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {cargo.name}
        </text>
        <text
          x={cx}
          y={y - cargoHeight / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={9}
          style={{ pointerEvents: 'none' }}
        >
          {cargo.weight.toFixed(0)}N
        </text>
      </g>
    );
  };

  const raftTransform = `rotate(${(raftAngle * 180) / Math.PI} ${centerX} ${raftBaseY})`;

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{
        backgroundColor: '#e8f4f8',
        borderRadius: 8,
        maxWidth: '100%',
        height: 'auto',
      }}
    >
      <defs>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3498db" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1a5276" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="waterSurfaceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5dade2" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3498db" stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={0}
        y={waterSurfaceY - waveAmplitudePixels}
        width={svgWidth}
        height={svgHeight - waterSurfaceY + waveAmplitudePixels}
        fill="url(#waterGradient)"
      />

      <path
        d={`
          ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase)}
          L ${svgWidth} ${svgHeight}
          L 0 ${svgHeight}
          Z
        `}
        fill="url(#waterSurfaceGradient)"
        opacity={0.7}
      >
        {physicsRunning && (
          <animate
            attributeName="d"
            values={`
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase)} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z;
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI / 2)} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z;
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI)} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z;
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + (3 * Math.PI) / 2)} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z;
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI * 2)} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z
            `}
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </path>

      <path
        d={generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase)}
        fill="none"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        filter="url(#glow)"
        opacity={0.9}
      >
        {physicsRunning && (
          <animate
            attributeName="d"
            values={`
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase)};
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI / 2)};
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI)};
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + (3 * Math.PI) / 2)};
              ${generateWavePath(waterSurfaceY, waveAmplitudePixels, wavePhase + Math.PI * 2)}
            `}
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </path>

      <g transform={raftTransform}>
        {tubes.map((tube, index) => renderTube(tube, index))}
        {cargos.map((cargo) => renderCargo(cargo))}
      </g>

      <g>
        <line
          x1={PADDING - 20}
          y1={waterSurfaceY}
          x2={PADDING - 20}
          y2={raftBaseY + tubeRadius}
          stroke="#e74c3c"
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <line
          x1={PADDING - 25}
          y1={waterSurfaceY}
          x2={PADDING - 15}
          y2={waterSurfaceY}
          stroke="#e74c3c"
          strokeWidth={2}
        />
        <line
          x1={PADDING - 25}
          y1={raftBaseY + tubeRadius}
          x2={PADDING - 15}
          y2={raftBaseY + tubeRadius}
          stroke="#e74c3c"
          strokeWidth={2}
        />
        <text
          x={PADDING - 30}
          y={(waterSurfaceY + raftBaseY + tubeRadius) / 2}
          fill="#e74c3c"
          fontSize={12}
          fontWeight="bold"
          textAnchor="end"
          dominantBaseline="middle"
        >
          {draftDepth.toFixed(3)}m
        </text>
        <text
          x={PADDING - 30}
          y={(waterSurfaceY + raftBaseY + tubeRadius) / 2 + 14}
          fill="#7f8c8d"
          fontSize={10}
          textAnchor="end"
        >
          吃水
        </text>
      </g>

      {Math.abs(raftAngle) > 0.001 && (
        <g>
          <line
            x1={centerX - 40}
            y1={raftBaseY - tubeRadius - 20}
            x2={centerX + 40}
            y2={raftBaseY - tubeRadius - 20}
            stroke="#95a5a6"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <line
            x1={centerX - 40}
            y1={raftBaseY - tubeRadius - 20 - 40 * Math.tan(raftAngle)}
            x2={centerX + 40}
            y2={raftBaseY - tubeRadius - 20 + 40 * Math.tan(raftAngle)}
            stroke="#f39c12"
            strokeWidth={2}
          />
          <path
            d={`
              M ${centerX + 30} ${raftBaseY - tubeRadius - 20}
              A 30 30 0 ${raftAngle > 0 ? 0 : 1} ${raftAngle > 0 ? 1 : 0}
              ${centerX + 30 * Math.cos(raftAngle)} ${raftBaseY - tubeRadius - 20 - 30 * Math.sin(raftAngle)}
            `}
            fill="none"
            stroke="#f39c12"
            strokeWidth={2}
          />
          <text
            x={centerX + 50}
            y={raftBaseY - tubeRadius - 25}
            fill="#f39c12"
            fontSize={12}
            fontWeight="bold"
          >
            {Math.abs((raftAngle * 180) / Math.PI).toFixed(1)}°
          </text>
          <text
            x={centerX + 50}
            y={raftBaseY - tubeRadius - 10}
            fill="#7f8c8d"
            fontSize={10}
          >
            倾斜
          </text>
        </g>
      )}

      <text
        x={PADDING}
        y={30}
        fill="#2c3e50"
        fontSize={14}
        fontWeight="bold"
      >
        竹筏侧视图
      </text>
      <text
        x={svgWidth - PADDING}
        y={30}
        fill="#7f8c8d"
        fontSize={11}
        textAnchor="end"
      >
        宽度: {dims.width.toFixed(2)}m | 管径: {(config.tubeDiameter * 100).toFixed(0)}cm
      </text>

      <g>
        <line
          x1={svgWidth - PADDING - 10}
          y1={raftBaseY + tubeRadius + 20}
          x2={svgWidth - PADDING - 10}
          y2={waterSurfaceY}
          stroke="#3498db"
          strokeWidth={2}
        />
        <circle
          cx={svgWidth - PADDING - 10}
          cy={waterSurfaceY}
          r={4}
          fill="white"
          stroke="#3498db"
          strokeWidth={2}
        />
        <text
          x={svgWidth - PADDING - 15}
          y={raftBaseY + tubeRadius + 35}
          fill="#3498db"
          fontSize={10}
          textAnchor="end"
        >
          水位
        </text>
      </g>
    </svg>
  );
};
