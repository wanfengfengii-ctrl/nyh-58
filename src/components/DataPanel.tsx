import React from 'react';
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Progress,
  Card,
  SimpleGrid,
  Alert,
} from '@mantine/core';
import {
  IconAnchor,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconGauge,
} from '@tabler/icons-react';
import type { BuoyancyResult, StabilityResult } from '../types';

interface DataPanelProps {
  buoyancy: BuoyancyResult;
  stability: StabilityResult;
  configErrors: string[];
}

export const DataPanel: React.FC<DataPanelProps> = ({
  buoyancy,
  stability,
  configErrors,
}) => {
  const getTiltRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      default:
        return 'red';
    }
  };

  const getStabilityColor = (score: number) => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getLoadColor = (ratio: number) => {
    if (ratio < 0.6) return 'green';
    if (ratio < 0.85) return 'yellow';
    return 'red';
  };

  const isCenterOffsetHigh = Math.abs(stability.leftRightBalance) > 0.3;

  return (
    <Stack gap="md">
      {configErrors.length > 0 && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="参数错误"
          color="red"
          variant="filled"
        >
          <Stack gap={4}>
            {configErrors.map((err, i) => (
              <Text size="sm" key={i}>
                • {err}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {buoyancy.isOverloaded && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="超载警告"
          color="red"
          variant="filled"
        >
          总载重已超过浮力上限，竹筏将沉没！
        </Alert>
      )}

      <Paper p="md" shadow="sm" radius="md">
        <Group mb="md">
          <IconAnchor size={22} color="#228be6" />
          <Title order={4}>浮力与载重</Title>
        </Group>

        <Stack gap="md">
          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">载重比例</Text>
              <Badge color={getLoadColor(buoyancy.loadRatio)}>
                {(buoyancy.loadRatio * 100).toFixed(1)}%
              </Badge>
            </Group>
            <Progress
              value={buoyancy.loadRatio * 100}
              color={getLoadColor(buoyancy.loadRatio)}
              size="lg"
            />
          </div>

          <SimpleGrid cols={2}>
            <Card padding="sm" withBorder>
              <Text size="xs" c="dimmed">
                总浮力
              </Text>
              <Text size="lg" fw={700} c="blue">
                {buoyancy.totalBuoyancy.toFixed(1)} N
              </Text>
            </Card>
            <Card padding="sm" withBorder>
              <Text size="xs" c="dimmed">
                总重量
              </Text>
              <Text
                size="lg"
                fw={700}
                c={buoyancy.isOverloaded ? 'red' : 'dark'}
              >
                {buoyancy.totalWeight.toFixed(1)} N
              </Text>
            </Card>
          </SimpleGrid>

          <Card padding="sm" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">
                  吃水深度
                </Text>
                <Text size="lg" fw={700}>
                  {(buoyancy.draftDepth * 100).toFixed(1)} cm
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  排水量
                </Text>
                <Text size="lg" fw={700}>
                  {buoyancy.displacement.toFixed(3)} m³
                </Text>
              </div>
            </Group>
          </Card>
        </Stack>
      </Paper>

      <Paper p="md" shadow="sm" radius="md">
        <Group mb="md">
          <IconGauge size={22} color={getStabilityColor(stability.stabilityScore)} />
          <Title order={4}>稳定性分析</Title>
        </Group>

        <Stack gap="md">
          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">稳定性评分</Text>
              <Badge color={getStabilityColor(stability.stabilityScore)}>
                {stability.stabilityScore.toFixed(0)} 分
              </Badge>
            </Group>
            <Progress
              value={stability.stabilityScore}
              color={getStabilityColor(stability.stabilityScore)}
              size="lg"
            />
          </div>

          <Card padding="sm" withBorder>
            <Group justify="space-between">
              <Text size="sm">倾斜风险</Text>
              <Badge color={getTiltRiskColor(stability.tiltRisk)} size="lg">
                {stability.tiltRisk === 'low'
                  ? '低'
                  : stability.tiltRisk === 'medium'
                  ? '中'
                  : '高'}
              </Badge>
            </Group>
          </Card>

          <SimpleGrid cols={2}>
            <Card
              padding="sm"
              withBorder
              style={{
                borderColor: isCenterOffsetHigh ? '#fa5252' : undefined,
              }}
            >
              <Text size="xs" c="dimmed">
                左右重心偏差
              </Text>
              <Text
                size="lg"
                fw={700}
                c={isCenterOffsetHigh ? 'red' : 'dark'}
              >
                {stability.leftRightBalance >= 0 ? '+' : ''}
                {(stability.leftRightBalance * 100).toFixed(1)}%
              </Text>
              <Text size="xs" c="dimmed">
                {stability.leftRightBalance >= 0 ? '偏右' : '偏左'}
              </Text>
            </Card>
            <Card padding="sm" withBorder>
              <Text size="xs" c="dimmed">
                前后重心偏差
              </Text>
              <Text size="lg" fw={700}>
                {stability.frontBackBalance >= 0 ? '+' : ''}
                {(stability.frontBackBalance * 100).toFixed(1)}%
              </Text>
              <Text size="xs" c="dimmed">
                {stability.frontBackBalance >= 0 ? '偏后' : '偏前'}
              </Text>
            </Card>
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <Card padding="sm" withBorder>
              <Text size="xs" c="dimmed">
                左侧重量
              </Text>
              <Text size="md" fw={600}>
                {stability.leftWeight.toFixed(1)} N
              </Text>
            </Card>
            <Card padding="sm" withBorder>
              <Text size="xs" c="dimmed">
                右侧重量
              </Text>
              <Text size="md" fw={600}>
                {stability.rightWeight.toFixed(1)} N
              </Text>
            </Card>
          </SimpleGrid>

          <Card
            padding="sm"
            withBorder
            style={{
              backgroundColor: stability.isSailable ? '#ebfbee' : '#fff5f5',
              borderColor: stability.isSailable ? '#40c057' : '#fa5252',
            }}
          >
            <Group gap="sm">
              {stability.isSailable ? (
                <IconCheck size={24} color="#40c057" />
              ) : (
                <IconX size={24} color="#fa5252" />
              )}
              <div>
                <Text size="md" fw={700}>
                  {stability.isSailable ? '可出航' : '不可出航'}
                </Text>
                <Text size="xs" c="dimmed">
                  {stability.isSailable
                    ? '当前方案满足航行条件'
                    : '请调整载重或增加竹筒'}
                </Text>
              </div>
            </Group>
          </Card>
        </Stack>
      </Paper>
    </Stack>
  );
};
