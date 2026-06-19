import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { RiverZone, RoutePoint, RoutePlan } from '../types';
import { RIVER_ZONE_COLORS, RIVER_ZONE_LABELS, RIVER_MAP_SCALE } from '../constants';
import { getRiskLevelColor, getSafetyScoreColor } from '../utils/routePlanning';

interface RouteMapCanvasProps {
  width: number;
  height: number;
  riverZones: RiverZone[];
  routePoints: RoutePoint[];
  routes: RoutePlan[];
  selectedRouteIndex: number;
  onMapClick: (x: number, y: number) => void;
  onPointDrag: (pointId: string, x: number, y: number) => void;
  onPointRightClick: (pointId: string) => void;
}

const POINT_RADIUS = 10;
const POINT_COLORS: Record<string, string> = {
  start: '#40c057',
  end: '#fa5252',
  waypoint: '#228be6',
};

const POINT_LABELS: Record<string, string> = {
  start: '起',
  end: '终',
  waypoint: '经',
};

function renderRouteLine(
  ctx: CanvasRenderingContext2D,
  route: RoutePlan,
  alpha: number,
  dashed: boolean,
  toCanvasXFn: (x: number) => number,
  toCanvasYFn: (y: number) => number
) {
  if (route.points.length < 2) return;

  const color = getRiskLevelColor(route.overallRiskLevel);

  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = dashed ? 2 : 3;
  if (dashed) ctx.setLineDash([6, 4]);
  else ctx.setLineDash([]);

  ctx.beginPath();
  for (let i = 0; i < route.points.length; i++) {
    const px = toCanvasXFn(route.points[i].x);
    const py = toCanvasYFn(route.points[i].y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
}

export const RouteMapCanvas: React.FC<RouteMapCanvasProps> = ({
  width,
  height,
  riverZones,
  routePoints,
  routes,
  selectedRouteIndex,
  onMapClick,
  onPointDrag,
  onPointRightClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointId: string; offsetX: number; offsetY: number } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>('crosshair');

  const toCanvasX = useCallback(
    (mapX: number) => mapX * RIVER_MAP_SCALE + (width - 200 * RIVER_MAP_SCALE) / 2,
    [width]
  );
  const toCanvasY = useCallback(
    (mapY: number) => mapY * RIVER_MAP_SCALE,
    []
  );
  const toMapX = useCallback(
    (canvasX: number) => (canvasX - (width - 200 * RIVER_MAP_SCALE) / 2) / RIVER_MAP_SCALE,
    [width]
  );
  const toMapY = useCallback(
    (canvasY: number) => canvasY / RIVER_MAP_SCALE,
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#c5d0dc';
    const bankLeft = toCanvasX(-20);
    const bankRight = toCanvasX(220);
    ctx.fillRect(bankLeft, 0, toCanvasX(0) - bankLeft, height);
    ctx.fillRect(toCanvasX(200), 0, bankRight - toCanvasX(200), height);

    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toCanvasX(200), 0);
    ctx.lineTo(toCanvasX(200), height);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const zone of riverZones) {
      const zx = toCanvasX(zone.x);
      const zy = toCanvasY(zone.y);
      const zw = zone.width * RIVER_MAP_SCALE;
      const zh = zone.height * RIVER_MAP_SCALE;

      ctx.fillStyle = RIVER_ZONE_COLORS[zone.type] + '40';
      ctx.fillRect(zx, zy, zw, zh);

      ctx.strokeStyle = RIVER_ZONE_COLORS[zone.type] + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(zx, zy, zw, zh);

      ctx.fillStyle = RIVER_ZONE_COLORS[zone.type];
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(zone.name, zx + zw / 2, zy + 4);

      ctx.fillStyle = '#495057';
      ctx.font = '9px sans-serif';
      ctx.fillText(
        `${RIVER_ZONE_LABELS[zone.type]} | ${zone.baseFlowSpeed}m/s`,
        zx + zw / 2,
        zy + 18
      );
    }

    if (routes.length > 0 && selectedRouteIndex >= 0 && selectedRouteIndex < routes.length) {
      const inactiveRoutes = routes.filter((_, i) => i !== selectedRouteIndex);
      for (const route of inactiveRoutes) {
        renderRouteLine(ctx, route, 0.2, true, toCanvasX, toCanvasY);
      }
      const activeRoute = routes[selectedRouteIndex];
      renderRouteLine(ctx, activeRoute, 1.0, false, toCanvasX, toCanvasY);

      for (const segment of activeRoute.segments) {
        const fromPoint = activeRoute.points.find((p) => p.id === segment.fromPointId);
        const toPoint = activeRoute.points.find((p) => p.id === segment.toPointId);
        if (fromPoint && toPoint) {
          const midX = toCanvasX((fromPoint.x + toPoint.x) / 2);
          const midY = toCanvasY((fromPoint.y + toPoint.y) / 2);

          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(midX + 16, midY, 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = getSafetyScoreColor(segment.safetyScore);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(midX + 16, midY, 10, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = getSafetyScoreColor(segment.safetyScore);
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(segment.safetyScore), midX + 16, midY);
        }
      }

      for (const hazard of activeRoute.warnings) {
        if (hazard.severity === 'critical' || hazard.severity === 'high') {
          const hx = toCanvasX(hazard.position.x);
          const hy = toCanvasY(hazard.position.y);
          ctx.fillStyle = hazard.severity === 'critical' ? '#fa5252' : '#fab005';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠', hx - 16, hy);
        }
      }
    }

    for (const point of routePoints) {
      const px = toCanvasX(point.x);
      const py = toCanvasY(point.y);
      const color = POINT_COLORS[point.type];
      const isHovered = hoverRef.current === point.id;
      const r = isHovered ? POINT_RADIUS + 3 : POINT_RADIUS;

      ctx.fillStyle = color + '30';
      ctx.beginPath();
      ctx.arc(px, py, r + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POINT_LABELS[point.type], px, py + 1);

      ctx.fillStyle = '#212529';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(point.name, px, py - r - 8);
    }
  }, [width, height, riverZones, routePoints, routes, selectedRouteIndex, toCanvasX, toCanvasY]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPointAtPosition = useCallback(
    (canvasX: number, canvasY: number): RoutePoint | null => {
      for (const point of routePoints) {
        const px = toCanvasX(point.x);
        const py = toCanvasY(point.y);
        const dist = Math.sqrt((canvasX - px) ** 2 + (canvasY - py) ** 2);
        if (dist <= POINT_RADIUS + 6) return point;
      }
      return null;
    },
    [routePoints, toCanvasX, toCanvasY]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      if (e.button === 2) {
        const point = getPointAtPosition(canvasX, canvasY);
        if (point && point.type === 'waypoint') {
          onPointRightClick(point.id);
        }
        return;
      }

      const point = getPointAtPosition(canvasX, canvasY);
      if (point) {
        dragRef.current = {
          pointId: point.id,
          offsetX: canvasX - toCanvasX(point.x),
          offsetY: canvasY - toCanvasY(point.y),
        };
        setCursorStyle('grabbing');
      } else {
        const mapX = toMapX(canvasX);
        const mapY = toMapY(canvasY);
        if (mapX >= 0 && mapX <= 200 && mapY >= 0 && mapY <= 2500) {
          onMapClick(mapX, mapY);
        }
      }
    },
    [getPointAtPosition, onMapClick, onPointRightClick, toCanvasX, toCanvasY, toMapX, toMapY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      if (dragRef.current) {
        const mapX = toMapX(canvasX - dragRef.current.offsetX);
        const mapY = toMapY(canvasY - dragRef.current.offsetY);
        const clampedX = Math.max(10, Math.min(190, mapX));
        const clampedY = Math.max(10, Math.min(2490, mapY));
        onPointDrag(dragRef.current.pointId, clampedX, clampedY);
        return;
      }

      const point = getPointAtPosition(canvasX, canvasY);
      const newHoverId = point?.id ?? null;
      if (newHoverId !== hoverRef.current) {
        hoverRef.current = newHoverId;
        setCursorStyle(point ? 'grab' : 'crosshair');
        draw();
      }
    },
    [draw, getPointAtPosition, onPointDrag, toMapX, toMapY]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setCursorStyle('crosshair');
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: cursorStyle, borderRadius: 8, border: '1px solid #dee2e6' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
};
