import React, { useState, useMemo, useCallback } from 'react';
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Card,
  ScrollArea,
  Button,
  Progress,
  Divider,
  Alert,
  Grid,
  SegmentedControl,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconMap,
  IconRoute,
  IconAlertTriangle,
  IconX,
  IconInfoCircle,
  IconRefresh,
  IconTrash,
  IconPlus,
  IconClock,
  IconRuler,
  IconShield,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconBan,
  IconFlag,
} from '@tabler/icons-react';
import type {
  RaftConfig,
  BuoyancyResult,
  StabilityResult,
  WeatherReport,
  NightNavigationReport,
  RiverZone,
  RoutePoint,
  RoutePlanningResult,
} from '../types';
import {
  RIVER_ZONE_LABELS,
  RIVER_ZONE_COLORS,
  RISK_LABELS,
  RISK_COLORS,
  generateRoutePointId,
  DEFAULT_RIVER_ZONES,
  ROUTE_PLAN_TAGS,
} from '../constants';
import { planRoutes, getSafetyScoreColor, getRiskLevelColor } from '../utils/routePlanning';
import { RouteMapCanvas } from './RouteMapCanvas';

interface RoutePlanningPanelProps {
  raftConfig: RaftConfig;
  buoyancy: BuoyancyResult;
  stability: StabilityResult;
  weatherReport: WeatherReport | null;
  nightNavigationReport: NightNavigationReport | null;
}

export const RoutePlanningPanel: React.FC<RoutePlanningPanelProps> = ({
  raftConfig,
  buoyancy,
  stability,
  weatherReport,
  nightNavigationReport,
}) => {
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([
    { id: 'rp-start', x: 100, y: 50, type: 'start', name: '起点' },
    { id: 'rp-end', x: 100, y: 2400, type: 'end', name: '终点' },
  ]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [riverZones] = useState<RiverZone[]>(DEFAULT_RIVER_ZONES);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [showHazardDetails, setShowHazardDetails] = useState(false);

  const planningResult: RoutePlanningResult = useMemo(() => {
    return planRoutes({
      points: routePoints,
      raftConfig,
      buoyancy,
      stability,
      weatherReport,
      nightNavigationReport,
      riverZones,
    });
  }, [routePoints, raftConfig, buoyancy, stability, weatherReport, nightNavigationReport, riverZones]);

  const routes = planningResult.routes;
  const selectedRoute = routes.length > 0 && selectedRouteIndex < routes.length
    ? routes[selectedRouteIndex]
    : null;

  const handleMapClick = useCallback((x: number, y: number) => {
    const hasStart = routePoints.some((p) => p.type === 'start');
    const hasEnd = routePoints.some((p) => p.type === 'end');

    if (!hasStart) {
      setRoutePoints((prev) => [
        ...prev,
        { id: generateRoutePointId(), x, y, type: 'start', name: '起点' },
      ]);
    } else if (!hasEnd) {
      setRoutePoints((prev) => [
        ...prev,
        { id: generateRoutePointId(), x, y, type: 'end', name: '终点' },
      ]);
    } else {
      const waypointIndex = routePoints.filter((p) => p.type === 'waypoint').length + 1;
      const insertIndex = routePoints.findIndex((p) => p.type === 'end');
      const newPoint: RoutePoint = {
        id: generateRoutePointId(),
        x,
        y,
        type: 'waypoint',
        name: `途经${waypointIndex}`,
      };
      setRoutePoints((prev) => [
        ...prev.slice(0, insertIndex),
        newPoint,
        ...prev.slice(insertIndex),
      ]);
    }
  }, [routePoints]);

  const handlePointDrag = useCallback((pointId: string, x: number, y: number) => {
    setRoutePoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, x, y } : p))
    );
  }, []);

  const handlePointRightClick = useCallback((pointId: string) => {
    setRoutePoints((prev) => prev.filter((p) => p.id !== pointId));
  }, []);

  const handleRemovePoint = useCallback((pointId: string) => {
    setRoutePoints((prev) => prev.filter((p) => p.id !== pointId));
  }, []);

  const handleClearPoints = useCallback(() => {
    setRoutePoints([]);
    setSelectedRouteIndex(0);
  }, []);

  const handleResetPoints = useCallback(() => {
    setRoutePoints([
      { id: 'rp-start', x: 100, y: 50, type: 'start', name: '起点' },
      { id: 'rp-end', x: 100, y: 2400, type: 'end', name: '终点' },
    ]);
    setSelectedRouteIndex(0);
  }, []);

  const toggleSegment = useCallback((segmentKey: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(segmentKey)) next.delete(segmentKey);
      else next.add(segmentKey);
      return next;
    });
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <IconBan size={16} color="#fa5252" />;
      case 'high': return <IconAlertCircle size={16} color="#fab005" />;
      case 'medium': return <IconAlertTriangle size={16} color="#228be6" />;
      case 'low': return <IconInfoCircle size={16} color="#868e96" />;
      default: return <IconInfoCircle size={16} />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'yellow';
      case 'medium': return 'blue';
      default: return 'gray';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return '极高';
      case 'high': return '高';
      case 'medium': return '中';
      default: return '低';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  };

  return (
    <Stack gap="md">
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper p="md" shadow="sm" radius="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <IconMap size={22} color="#228be6" />
                  <Title order={4}>河道地图</Title>
                </Group>
                <Group gap="xs">
                  <Tooltip label="重置起终点">
                    <ActionIcon variant="light" size="sm" onClick={handleResetPoints}>
                      <IconRefresh size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="清除所有点">
                    <ActionIcon variant="light" size="sm" color="red" onClick={handleClearPoints}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              <ScrollArea.Autosize mah={520} type="auto">
                <RouteMapCanvas
                  width={350}
                  height={625}
                  riverZones={riverZones}
                  routePoints={routePoints}
                  routes={routes}
                  selectedRouteIndex={selectedRouteIndex}
                  onMapClick={handleMapClick}
                  onPointDrag={handlePointDrag}
                  onPointRightClick={handlePointRightClick}
                />
              </ScrollArea.Autosize>

              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" p="xs">
                <Text size="xs">
                  左键点击空白处添加途经点；拖拽移动点位；右键删除途经点
                </Text>
              </Alert>

              <Stack gap={4}>
                {riverZones.map((zone) => (
                  <Group key={zone.id} gap="xs" wrap="nowrap">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: RIVER_ZONE_COLORS[zone.type],
                        flexShrink: 0,
                      }}
                    />
                    <Text size="xs" c="dimmed" truncate>
                      {zone.name}
                    </Text>
                    <Badge size="xs" variant="light" color="gray" ml="auto">
                      {RIVER_ZONE_LABELS[zone.type]}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <Paper p="md" shadow="sm" radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconFlag size={22} color="#228be6" />
                    <Title order={4}>航点设置</Title>
                  </Group>
                  <Badge color="blue" variant="light">
                    {routePoints.length} 个点
                  </Badge>
                </Group>

                {routePoints.length === 0 && (
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                    请在左侧地图上点击设置起点和终点
                  </Alert>
                )}

                <Stack gap="xs">
                  {routePoints.map((point) => (
                    <Card
                      key={point.id}
                      padding="xs"
                      withBorder
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor:
                          point.type === 'start'
                            ? '#40c057'
                            : point.type === 'end'
                            ? '#fa5252'
                            : '#228be6',
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <Badge
                            size="sm"
                            color={
                              point.type === 'start'
                                ? 'green'
                                : point.type === 'end'
                                ? 'red'
                                : 'blue'
                            }
                            variant="filled"
                          >
                            {point.type === 'start' ? '起' : point.type === 'end' ? '终' : '经'}
                          </Badge>
                          <Text size="sm" fw={500}>
                            {point.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            ({point.x.toFixed(0)}, {point.y.toFixed(0)})
                          </Text>
                        </Group>
                        {point.type === 'waypoint' && (
                          <ActionIcon
                            size="xs"
                            variant="light"
                            color="red"
                            onClick={() => handleRemovePoint(point.id)}
                          >
                            <IconX size={12} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>

                {routePoints.length > 0 && (
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => handleMapClick(100, 1250)}
                  >
                    在地图上添加途经点
                  </Button>
                )}
              </Stack>
            </Paper>

            {routes.length > 0 && (
              <Paper p="md" shadow="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconRoute size={22} color="#228be6" />
                      <Title order={4}>路线方案对比</Title>
                    </Group>
                  </Group>

                  <SegmentedControl
                    value={String(selectedRouteIndex)}
                    onChange={(v) => setSelectedRouteIndex(Number(v))}
                    data={routes.map((route, i) => ({
                      value: String(i),
                      label: (
                        <Group gap={4} wrap="nowrap">
                          <Text size="xs" fw={500}>
                            {route.name}
                          </Text>
                          {i === planningResult.recommendedRouteIndex && (
                            <Badge size="xs" color="green" variant="filled">
                              推荐
                            </Badge>
                          )}
                        </Group>
                      ),
                    }))}
                    fullWidth
                    size="sm"
                  />

                  {routes.map((route, i) => (
                    <Card
                      key={route.id}
                      padding="sm"
                      withBorder
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor: i === selectedRouteIndex
                          ? getRiskLevelColor(route.overallRiskLevel)
                          : '#dee2e6',
                        opacity: i === selectedRouteIndex ? 1 : 0.6,
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedRouteIndex(i)}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <Text size="sm" fw={600}>
                            {route.name}
                          </Text>
                          {route.tags.map((tag) => (
                            <Badge
                              key={tag}
                              size="xs"
                              variant="light"
                              color={tag === ROUTE_PLAN_TAGS.notRecommended ? 'red' : 'blue'}
                            >
                              {tag}
                            </Badge>
                          ))}
                          {i === planningResult.recommendedRouteIndex && (
                            <Badge size="xs" color="green" variant="filled">
                              推荐
                            </Badge>
                          )}
                        </Group>
                        <Group gap="md" wrap="nowrap">
                          <Stack gap={0} align="center">
                            <Text size="xs" c="dimmed">安全分</Text>
                            <Text
                              size="md"
                              fw={700}
                              c={getSafetyScoreColor(route.overallSafetyScore)}
                            >
                              {route.overallSafetyScore}
                            </Text>
                          </Stack>
                          <Stack gap={0} align="center">
                            <Text size="xs" c="dimmed">耗时</Text>
                            <Text size="sm" fw={500}>
                              {formatTime(route.totalEstimatedTime)}
                            </Text>
                          </Stack>
                          <Stack gap={0} align="center">
                            <Text size="xs" c="dimmed">距离</Text>
                            <Text size="sm" fw={500}>
                              {route.totalDistance}m
                            </Text>
                          </Stack>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Paper>
            )}

            {selectedRoute && (
              <Paper p="md" shadow="sm" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconShield size={22} color={getSafetyScoreColor(selectedRoute.overallSafetyScore)} />
                      <Title order={4}>路线详情</Title>
                    </Group>
                    <Badge
                      size="lg"
                      color={RISK_COLORS[selectedRoute.overallRiskLevel]}
                      variant="filled"
                    >
                      {RISK_LABELS[selectedRoute.overallRiskLevel]}
                    </Badge>
                  </Group>

                  {selectedRoute.isNotRecommended && (
                    <Alert
                      icon={<IconBan size={16} />}
                      color="red"
                      variant="filled"
                      title="不建议出航"
                    >
                      <Text size="sm">
                        该路线存在严重安全风险，系统不建议出航。如必须出行，请做好充分应急准备并告知他人您的行程。
                      </Text>
                    </Alert>
                  )}

                  <Card padding="md" withBorder>
                    <Grid columns={3} gap="md">
                      <Grid.Col span={1}>
                        <Stack gap={0} align="center">
                          <IconRuler size={20} color="#868e96" />
                          <Text size="xs" c="dimmed" mt={4}>总距离</Text>
                          <Text size="lg" fw={700}>{selectedRoute.totalDistance}m</Text>
                        </Stack>
                      </Grid.Col>
                      <Grid.Col span={1}>
                        <Stack gap={0} align="center">
                          <IconClock size={20} color="#868e96" />
                          <Text size="xs" c="dimmed" mt={4}>预计耗时</Text>
                          <Text size="lg" fw={700}>{formatTime(selectedRoute.totalEstimatedTime)}</Text>
                        </Stack>
                      </Grid.Col>
                      <Grid.Col span={1}>
                        <Stack gap={0} align="center">
                          <IconShield size={20} color={getSafetyScoreColor(selectedRoute.overallSafetyScore)} />
                          <Text size="xs" c="dimmed" mt={4}>综合安全分</Text>
                          <Text size="lg" fw={700} c={getSafetyScoreColor(selectedRoute.overallSafetyScore)}>
                            {selectedRoute.overallSafetyScore}
                          </Text>
                        </Stack>
                      </Grid.Col>
                    </Grid>
                    <Progress
                      value={selectedRoute.overallSafetyScore}
                      color={getSafetyScoreColor(selectedRoute.overallSafetyScore)}
                      size="md"
                      mt="md"
                    />
                  </Card>

                  <Divider label="分段安全评分" labelPosition="center" />

                  <Stack gap="xs">
                    {selectedRoute.segments.map((segment) => {
                      const fromPoint = selectedRoute.points.find((p) => p.id === segment.fromPointId);
                      const toPoint = selectedRoute.points.find((p) => p.id === segment.toPointId);
                      const segmentKey = `${segment.fromPointId}-${segment.toPointId}`;
                      const isExpanded = expandedSegments.has(segmentKey);

                      return (
                        <Card
                          key={segmentKey}
                          padding="sm"
                          withBorder
                          style={{
                            borderLeftWidth: 4,
                            borderLeftColor: getSafetyScoreColor(segment.safetyScore),
                          }}
                        >
                          <Group
                            justify="space-between"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleSegment(segmentKey)}
                          >
                            <Group gap="xs" wrap="nowrap">
                              <Text size="sm" fw={500}>
                                {fromPoint?.name ?? '?'} → {toPoint?.name ?? '?'}
                              </Text>
                            </Group>
                            <Group gap="md" wrap="nowrap">
                              <Badge
                                size="sm"
                                variant="light"
                                color={RISK_COLORS[segment.riskLevel]}
                              >
                                {RISK_LABELS[segment.riskLevel]}
                              </Badge>
                              <Text
                                size="lg"
                                fw={700}
                                c={getSafetyScoreColor(segment.safetyScore)}
                              >
                                {segment.safetyScore}
                              </Text>
                              {isExpanded ? (
                                <IconChevronUp size={16} />
                              ) : (
                                <IconChevronDown size={16} />
                              )}
                            </Group>
                          </Group>

                          <Progress
                            value={segment.safetyScore}
                            color={getSafetyScoreColor(segment.safetyScore)}
                            size="sm"
                            mt="xs"
                          />

                          {isExpanded && (
                            <Stack gap="xs" mt="sm">
                              <Group gap="md">
                                <Text size="xs" c="dimmed">
                                  距离: {segment.distance.toFixed(1)}m
                                </Text>
                                <Text size="xs" c="dimmed">
                                  流速: {segment.flowSpeed.toFixed(1)}m/s
                                </Text>
                                <Text size="xs" c="dimmed">
                                  耗时: {formatTime(segment.estimatedTime)}
                                </Text>
                              </Group>

                              {segment.zoneTypes.length > 0 && (
                                <Group gap="xs">
                                  <Text size="xs" c="dimmed">经过区域:</Text>
                                  {segment.zoneTypes.map((zt) => (
                                    <Badge
                                      key={zt}
                                      size="xs"
                                      variant="light"
                                      color="gray"
                                      leftSection={
                                        <div
                                          style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 2,
                                            backgroundColor: RIVER_ZONE_COLORS[zt],
                                            display: 'inline-block',
                                          }}
                                        />
                                      }
                                    >
                                      {RIVER_ZONE_LABELS[zt]}
                                    </Badge>
                                  ))}
                                </Group>
                              )}

                              {segment.hazards.length > 0 && (
                                <Stack gap={4}>
                                  <Text size="xs" fw={500} c="dimmed">该段风险提示:</Text>
                                  {segment.hazards.map((hazard) => (
                                    <Group key={hazard.id} gap="xs" wrap="nowrap">
                                      {getSeverityIcon(hazard.severity)}
                                      <Text size="xs" style={{ flex: 1 }}>
                                        {hazard.description}
                                      </Text>
                                      <Badge
                                        size="xs"
                                        variant="light"
                                        color={getSeverityBadgeColor(hazard.severity)}
                                      >
                                        {getSeverityLabel(hazard.severity)}
                                      </Badge>
                                    </Group>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          )}
                        </Card>
                      );
                    })}
                  </Stack>

                  {selectedRoute.warnings.length > 0 && (
                    <>
                      <Divider label="全线风险预警" labelPosition="center" />

                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          共 {selectedRoute.warnings.length} 条预警
                        </Text>
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => setShowHazardDetails(!showHazardDetails)}
                          rightSection={
                            showHazardDetails ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                          }
                        >
                          {showHazardDetails ? '收起' : '展开全部'}
                        </Button>
                      </Group>

                      {showHazardDetails && (
                        <ScrollArea.Autosize mah={300} type="auto">
                          <Stack gap="xs">
                            {selectedRoute.warnings
                              .sort((a, b) => {
                                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                                return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
                              })
                              .map((hazard) => (
                                <Card
                                  key={hazard.id}
                                  padding="xs"
                                  withBorder
                                  style={{
                                    backgroundColor:
                                      hazard.severity === 'critical'
                                        ? '#fff5f5'
                                        : hazard.severity === 'high'
                                        ? '#fff9db'
                                        : '#e7f5ff',
                                    borderLeftWidth: 4,
                                    borderLeftColor: getSeverityBadgeColor(hazard.severity) === 'red'
                                      ? '#fa5252'
                                      : getSeverityBadgeColor(hazard.severity) === 'yellow'
                                      ? '#fab005'
                                      : '#228be6',
                                  }}
                                >
                                  <Group gap="xs" align="flex-start" wrap="nowrap">
                                    {getSeverityIcon(hazard.severity)}
                                    <Stack gap={2} style={{ flex: 1 }}>
                                      <Group justify="space-between" wrap="nowrap">
                                        <Text size="xs" fw={600}>
                                          {hazard.type === 'rapid'
                                            ? '急流'
                                            : hazard.type === 'strong_wind'
                                            ? '强风'
                                            : hazard.type === 'low_visibility'
                                            ? '低能见度'
                                            : hazard.type === 'obstacle'
                                            ? '障碍物'
                                            : hazard.type === 'shallow'
                                            ? '浅滩'
                                            : hazard.type === 'narrows'
                                            ? '狭窄航道'
                                            : hazard.type === 'overload'
                                            ? '超载'
                                            : '不稳定'}
                                        </Text>
                                        <Badge
                                          size="xs"
                                          variant="light"
                                          color={getSeverityBadgeColor(hazard.severity)}
                                        >
                                          {getSeverityLabel(hazard.severity)}
                                        </Badge>
                                      </Group>
                                      <Text size="xs" c="dimmed">
                                        {hazard.description}
                                      </Text>
                                    </Stack>
                                  </Group>
                                </Card>
                              ))}
                          </Stack>
                        </ScrollArea.Autosize>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
