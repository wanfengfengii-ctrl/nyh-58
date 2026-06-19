import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { RaftConfig, Cargo } from '../types';
import { generateBambooTubes, calculateRaftDimensions, clampCargoToBounds } from '../utils/raftGeometry';

interface RaftTopViewProps {
  config: RaftConfig;
  cargos: Cargo[];
  cogX: number;
  cogY: number;
  onCargoMove: (cargoId: string, x: number, y: number) => void;
  onCargoSelect?: (cargoId: string | null) => void;
  selectedCargoId?: string | null;
}

const SCALE = 60;
const PADDING = 40;

export const RaftTopView: React.FC<RaftTopViewProps> = ({
  config,
  cargos,
  cogX,
  cogY,
  onCargoMove,
  onCargoSelect,
  selectedCargoId,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const dims = calculateRaftDimensions(config);
  const tubes = generateBambooTubes(config);

  const svgWidth = dims.width * SCALE + PADDING * 2;
  const svgHeight = dims.height * SCALE + PADDING * 2;

  const toSvgX = (x: number) => PADDING + (x - dims.left) * SCALE;
  const toSvgY = (y: number) => PADDING + (y - dims.top) * SCALE;
  const toWorldX = (svgX: number) => (svgX - PADDING) / SCALE + dims.left;
  const toWorldY = (svgY: number) => (svgY - PADDING) / SCALE + dims.top;

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cargo: Cargo) => {
      e.stopPropagation();
      const pos = getMousePosition(e);
      const cargoSvgX = toSvgX(cargo.x);
      const cargoSvgY = toSvgY(cargo.y);
      setDragOffset({
        x: pos.x - cargoSvgX,
        y: pos.y - cargoSvgY,
      });
      setDraggingId(cargo.id);
      onCargoSelect?.(cargo.id);
    },
    [getMousePosition, onCargoSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const pos = getMousePosition(e);
      const worldX = toWorldX(pos.x - dragOffset.x);
      const worldY = toWorldY(pos.y - dragOffset.y);

      const cargo = cargos.find((c) => c.id === draggingId);
      if (!cargo) return;

      const clamped = clampCargoToBounds(
        worldX,
        worldY,
        cargo.width,
        cargo.height,
        config
      );

      onCargoMove(draggingId, clamped.x, clamped.y);
    },
    [draggingId, dragOffset, getMousePosition, cargos, config, onCargoMove]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleSvgClick = useCallback(() => {
    onCargoSelect?.(null);
  }, [onCargoSelect]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const raftSvgX = toSvgX(dims.left);
  const raftSvgY = toSvgY(dims.top);
  const raftSvgWidth = dims.width * SCALE;
  const raftSvgHeight = dims.height * SCALE;

  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      style={{
        backgroundColor: '#e8f4f8',
        borderRadius: 8,
        cursor: draggingId ? 'grabbing' : 'default',
      }}
      onClick={handleSvgClick}
    >
      <defs>
        <pattern id="waterPattern" patternUnits="userSpaceOnUse" width="20" height="20">
          <path
            d="M0 10 Q5 5 10 10 T20 10"
            stroke="#b8d4e3"
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      </defs>
      <rect
        x={0}
        y={0}
        width={svgWidth}
        height={svgHeight}
        fill="url(#waterPattern)"
      />

      <rect
        x={raftSvgX}
        y={raftSvgY}
        width={raftSvgWidth}
        height={raftSvgHeight}
        fill="#c4a35a"
        stroke="#8b7355"
        strokeWidth={2}
        rx={4}
      />

      {tubes.map((tube, index) => {
        const x = toSvgX(tube.x);
        const y = toSvgY(tube.y - tube.length / 2);
        const width = tube.diameter * SCALE;
        const height = tube.length * SCALE;

        return (
          <g key={tube.id}>
            <rect
              x={x - width / 2}
              y={y}
              width={width}
              height={height}
              fill={index % 2 === 0 ? '#d4b86a' : '#c9ad5f'}
              stroke="#8b7355"
              strokeWidth={1}
              rx={width / 2}
            />
            <line
              x1={x - width / 3}
              y1={y + height * 0.2}
              x2={x - width / 3}
              y2={y + height * 0.25}
              stroke="#8b7355"
              strokeWidth={1}
            />
            <line
              x1={x + width / 3}
              y1={y + height * 0.5}
              x2={x + width / 3}
              y2={y + height * 0.55}
              stroke="#8b7355"
              strokeWidth={1}
            />
            <line
              x1={x - width / 4}
              y1={y + height * 0.8}
              x2={x - width / 4}
              y2={y + height * 0.85}
              stroke="#8b7355"
              strokeWidth={1}
            />
          </g>
        );
      })}

      <line
        x1={toSvgX(0)}
        y1={raftSvgY}
        x2={toSvgX(0)}
        y2={raftSvgY + raftSvgHeight}
        stroke="#8b7355"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.5}
      />

      {cargos.map((cargo) => {
        const x = toSvgX(cargo.x);
        const y = toSvgY(cargo.y);
        const width = cargo.width * SCALE;
        const height = cargo.height * SCALE;
        const isSelected = selectedCargoId === cargo.id;
        const isDragging = draggingId === cargo.id;

        return (
          <g
            key={cargo.id}
            style={{
              cursor: 'grab',
              opacity: isDragging ? 0.8 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(e, cargo)}
          >
            <rect
              x={x - width / 2}
              y={y - height / 2}
              width={width}
              height={height}
              fill={cargo.color}
              stroke={isSelected ? '#2c3e50' : '#1a1a1a'}
              strokeWidth={isSelected ? 3 : 1}
              rx={4}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={12}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {cargo.name}
            </text>
            <text
              x={x}
              y={y + 16}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={10}
              style={{ pointerEvents: 'none' }}
            >
              {cargo.weight.toFixed(0)}N
            </text>
          </g>
        );
      })}

      <g>
        <circle
          cx={toSvgX(cogX)}
          cy={toSvgY(cogY)}
          r={8}
          fill="#e74c3c"
          stroke="white"
          strokeWidth={2}
        />
        <line
          x1={toSvgX(cogX) - 12}
          y1={toSvgY(cogY)}
          x2={toSvgX(cogX) + 12}
          y2={toSvgY(cogY)}
          stroke="#e74c3c"
          strokeWidth={2}
        />
        <line
          x1={toSvgX(cogX)}
          y1={toSvgY(cogY) - 12}
          x2={toSvgX(cogX)}
          y2={toSvgY(cogY) + 12}
          stroke="#e74c3c"
          strokeWidth={2}
        />
      </g>

      <text
        x={raftSvgX + 5}
        y={raftSvgY - 8}
        fill="#2c3e50"
        fontSize={12}
        fontWeight="bold"
      >
        竹筏俯视图
      </text>
      <text
        x={raftSvgX + raftSvgWidth - 5}
        y={raftSvgY - 8}
        fill="#7f8c8d"
        fontSize={10}
        textAnchor="end"
      >
        {dims.width.toFixed(2)}m × {dims.height.toFixed(2)}m
      </text>

      <text
        x={toSvgX(cogX)}
        y={toSvgY(cogY) - 18}
        fill="#e74c3c"
        fontSize={10}
        textAnchor="middle"
        fontWeight="bold"
      >
        重心
      </text>
    </svg>
  );
};
