import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { RaftConfig, Cargo, PhysicsState, CargoPhysicsState } from '../types';
import { generateBambooTubes, calculateRaftDimensions, clampCargoToBounds } from '../utils/raftGeometry';

interface RaftTopViewProps {
  config: RaftConfig;
  cargos: Cargo[];
  cogX: number;
  cogY: number;
  onCargoMove: (cargoId: string, x: number, y: number) => void;
  onCargoSelect?: (cargoId: string | null) => void;
  selectedCargoId?: string | null;
  raftAngle?: number;
  physicsState?: PhysicsState | null;
  physicsRunning?: boolean;
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
  raftAngle = 0,
  physicsState,
  physicsRunning = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null);

  const dims = useMemo(() => calculateRaftDimensions(config), [config]);
  const tubes = useMemo(() => generateBambooTubes(config), [config]);

  const svgWidth = dims.width * SCALE + PADDING * 2;
  const svgHeight = dims.height * SCALE + PADDING * 2;

  const toSvgX = useCallback((x: number) => PADDING + (x - dims.left) * SCALE, [dims]);
  const toSvgY = useCallback((y: number) => PADDING + (y - dims.top) * SCALE, [dims]);
  const toWorldX = useCallback((svgX: number) => (svgX - PADDING) / SCALE + dims.left, [dims]);
  const toWorldY = useCallback((svgY: number) => (svgY - PADDING) / SCALE + dims.top, [dims]);

  const getPositionFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const getMousePosition = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      return getPositionFromEvent(e.clientX, e.clientY);
    },
    [getPositionFromEvent]
  );

  const getTouchPosition = useCallback(
    (touch: React.Touch | Touch) => {
      return getPositionFromEvent(touch.clientX, touch.clientY);
    },
    [getPositionFromEvent]
  );

  const cargoPhysicsMap = useMemo(() => {
    const map = new Map<string, CargoPhysicsState>();
    if (physicsState?.cargosPhysics) {
      physicsState.cargosPhysics.forEach((cp) => {
        map.set(cp.cargoId, cp);
      });
    }
    return map;
  }, [physicsState]);

  const startDrag = useCallback(
    (cargoId: string, posX: number, posY: number) => {
      const cargo = cargos.find((c) => c.id === cargoId);
      if (!cargo) return;

      const cargoSvgX = toSvgX(cargo.x);
      const cargoSvgY = toSvgY(cargo.y);
      setDragOffset({
        x: posX - cargoSvgX,
        y: posY - cargoSvgY,
      });
      setDraggingId(cargoId);
      onCargoSelect?.(cargoId);
    },
    [cargos, toSvgX, toSvgY, onCargoSelect]
  );

  const moveDrag = useCallback(
    (dragId: string, posX: number, posY: number) => {
      if (!dragId) return;
      const worldX = toWorldX(posX - dragOffset.x);
      const worldY = toWorldY(posY - dragOffset.y);

      const cargo = cargos.find((c) => c.id === dragId);
      if (!cargo) return;

      const clamped = clampCargoToBounds(
        worldX,
        worldY,
        cargo.width,
        cargo.height,
        config
      );

      onCargoMove(dragId, clamped.x, clamped.y);
    },
    [dragOffset, toWorldX, toWorldY, cargos, config, onCargoMove]
  );

  const endDrag = useCallback(() => {
    setDraggingId(null);
    setTouchDraggingId(null);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cargo: Cargo) => {
      e.stopPropagation();
      if (physicsRunning) return;
      const pos = getMousePosition(e);
      startDrag(cargo.id, pos.x, pos.y);
    },
    [physicsRunning, getMousePosition, startDrag]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId || touchDraggingId) return;
      const pos = getMousePosition(e);
      moveDrag(draggingId, pos.x, pos.y);
    },
    [draggingId, touchDraggingId, getMousePosition, moveDrag]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, cargo: Cargo) => {
      e.stopPropagation();
      e.preventDefault();
      if (physicsRunning) return;
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getTouchPosition(touch);
        setTouchDraggingId(cargo.id);
        startDrag(cargo.id, pos.x, pos.y);
      }
    },
    [physicsRunning, getTouchPosition, startDrag]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchDraggingId || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getTouchPosition(touch);
      moveDrag(touchDraggingId, pos.x, pos.y);
    },
    [touchDraggingId, getTouchPosition, moveDrag]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchDraggingId) {
        e.preventDefault();
        endDrag();
      }
    },
    [touchDraggingId, endDrag]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      endDrag();
    }
  }, [draggingId, endDrag]);

  const handleSvgClick = useCallback(() => {
    onCargoSelect?.(null);
  }, [onCargoSelect]);

  useEffect(() => {
    if (draggingId && !touchDraggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, touchDraggingId, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (touchDraggingId) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [touchDraggingId, handleTouchMove, handleTouchEnd]);

  const raftCenterX = toSvgX(0);
  const raftCenterY = toSvgY(0);
  const raftSvgX = toSvgX(dims.left);
  const raftSvgY = toSvgY(dims.top);
  const raftSvgWidth = dims.width * SCALE;
  const raftSvgHeight = dims.height * SCALE;

  const displayAngle = physicsState?.raftAngle ?? raftAngle;
  const angleDeg = (displayAngle * 180) / Math.PI;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="auto"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{
        backgroundColor: '#e8f4f8',
        borderRadius: 8,
        cursor: draggingId ? 'grabbing' : 'default',
        maxWidth: svgWidth,
        touchAction: 'none',
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
        y={0}
        width={svgWidth}
        height={svgHeight}
        fill="url(#waterPattern)"
      />

      {physicsState?.waterLevel !== undefined && (
        <line
          x1={0}
          y1={raftCenterY + physicsState.waterLevel * SCALE}
          x2={svgWidth}
          y2={raftCenterY + physicsState.waterLevel * SCALE}
          stroke="rgba(52, 152, 219, 0.6)"
          strokeWidth={2}
          strokeDasharray="8,4"
        />
      )}

      <g
        style={{
          transform: `rotate(${angleDeg}deg)`,
          transformOrigin: `${raftCenterX}px ${raftCenterY}px`,
          transition: physicsRunning ? 'none' : 'transform 0.3s ease-out',
        }}
      >
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
          const cargoPhysics = cargoPhysicsMap.get(cargo.id);
          const isSlipping = cargoPhysics?.isSlipping;
          const slipDirection = cargoPhysics?.slipDirection;

          return (
            <g
              key={cargo.id}
              style={{
                cursor: physicsRunning ? 'default' : 'grab',
                opacity: isDragging ? 0.8 : 1,
              }}
              onMouseDown={(e) => handleMouseDown(e, cargo)}
              onTouchStart={(e) => handleTouchStart(e, cargo)}
            >
              {isSlipping && (
                <g style={{ pointerEvents: 'none' }}>
                  <path
                    d={slipDirection === 'right' 
                      ? `M ${x + width / 2 + 5} ${y - height / 2 - 5} L ${x + width / 2 + 15} ${y - height / 2 - 5} L ${x + width / 2 + 10} ${y - height / 2 - 10}`
                      : `M ${x - width / 2 - 5} ${y - height / 2 - 5} L ${x - width / 2 - 15} ${y - height / 2 - 5} L ${x - width / 2 - 10} ${y - height / 2 - 10}`
                    }
                    stroke="#e74c3c"
                    strokeWidth={2}
                    fill="none"
                  />
                </g>
              )}
              <rect
                x={x - width / 2}
                y={y - height / 2}
                width={width}
                height={height}
                fill={cargo.color}
                stroke={isSelected ? '#2c3e50' : isSlipping ? '#e74c3c' : '#1a1a1a'}
                strokeWidth={isSelected ? 3 : isSlipping ? 2 : 1}
                rx={4}
                filter={isSlipping ? 'url(#glow)' : undefined}
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
      </g>

      {Math.abs(displayAngle) > 0.001 && (
        <g style={{ pointerEvents: 'none' }}>
          <line
            x1={raftCenterX}
            y1={raftSvgY + raftSvgHeight + 20}
            x2={raftCenterX}
            y2={raftSvgY + raftSvgHeight + 40}
            stroke="#2c3e50"
            strokeWidth={1}
          />
          <line
            x1={raftCenterX}
            y1={raftSvgY + raftSvgHeight + 30}
            x2={raftCenterX + Math.sin(displayAngle) * 30}
            y2={raftSvgY + raftSvgHeight + 30 - Math.cos(displayAngle) * 30 + 30}
            stroke="#e67e22"
            strokeWidth={3}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={raftCenterX + 35}
            y={raftSvgY + raftSvgHeight + 35}
            fill="#e67e22"
            fontSize={12}
            fontWeight="bold"
          >
            {angleDeg.toFixed(1)}°
          </text>
        </g>
      )}

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
        style={{ pointerEvents: 'none' }}
      >
        重心
      </text>
    </svg>
  );
};
