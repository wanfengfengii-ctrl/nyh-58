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
  ScrollArea,
  Button,
  Skeleton,
  Box,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconInfoCircle,
  IconRefresh,
  IconFileReport,
} from '@tabler/icons-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { SailingReport, SailingReason } from '../types';

interface SailingReportPanelProps {
  report: SailingReport | null;
  onRefresh?: () => void;
  loading?: boolean;
}

const typeOrder = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3,
};

const typeColors = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
};

const typeBgColors = {
  success: '#ebfbee',
  warning: '#fff9db',
  error: '#fff5f5',
  info: '#e7f5ff',
};

const typeBorderColors = {
  success: '#40c057',
  warning: '#fab005',
  error: '#fa5252',
  info: '#228be6',
};

export const SailingReportPanel: React.FC<SailingReportPanelProps> = ({
  report,
  onRefresh,
  loading = false,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getTypeIcon = (type: SailingReason['type']) => {
    switch (type) {
      case 'success':
        return <IconCheck size={20} color={typeBorderColors[type]} />;
      case 'warning':
        return <IconAlertTriangle size={20} color={typeBorderColors[type]} />;
      case 'error':
        return <IconX size={20} color={typeBorderColors[type]} />;
      case 'info':
        return <IconInfoCircle size={20} color={typeBorderColors[type]} />;
    }
  };

  const sortedReasons = report
    ? [...report.reasons].sort(
        (a, b) => typeOrder[a.type] - typeOrder[b.type]
      )
    : [];

  const ringData = report
    ? [
        { name: '得分', value: report.score },
        { name: '剩余', value: 100 - report.score },
      ]
    : [];

  const renderScoreRing = () => {
    if (!report) return null;
    const color = typeBorderColors[getScoreColor(report.score) as keyof typeof typeBorderColors];
    return (
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ringData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f1f3f5" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text fw={700} c={color} style={{ fontSize: 36 }}>
            {report.score.toFixed(0)}
          </Text>
          <Text size="xs" c="dimmed">
            综合评分
          </Text>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Skeleton height={24} width={120} />
            <Skeleton height={32} width={100} />
          </Group>
          <Group justify="center" py="md">
            <Skeleton height={140} width={140} circle />
          </Group>
          <Skeleton height={60} />
          <Stack gap="sm">
            <Skeleton height={20} width={80} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={80} />
            ))}
          </Stack>
        </Stack>
      </Paper>
    );
  }

  if (!report) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Stack align="center" justify="center" py="xl" gap="md">
          <IconFileReport size={48} color="#adb5bd" />
          <Text c="dimmed" ta="center">
            暂无出航报告数据
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            请先配置竹筏参数和货物，然后点击分析按钮生成报告
          </Text>
          {onRefresh && (
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={onRefresh}
              variant="light"
            >
              生成报告
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md" shadow="sm" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconFileReport size={22} color="#228be6" />
            <Title order={4}>出航原因报告</Title>
          </Group>
          {onRefresh && (
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={onRefresh}
              variant="light"
              size="sm"
            >
              刷新
            </Button>
          )}
        </Group>

        <Group justify="space-around" align="flex-start" py="md">
          {renderScoreRing()}
          <Stack gap="sm" style={{ flex: 1 }}>
            <Card
              padding="md"
              withBorder
              style={{
                backgroundColor: report.canSail
                  ? typeBgColors.success
                  : typeBgColors.error,
                borderColor: report.canSail
                  ? typeBorderColors.success
                  : typeBorderColors.error,
              }}
            >
              <Group gap="sm">
                {report.canSail ? (
                  <IconCheck
                    size={28}
                    color={typeBorderColors.success}
                  />
                ) : (
                  <IconX size={28} color={typeBorderColors.error} />
                )}
                <Stack gap={2}>
                  <Text size="lg" fw={700}>
                    {report.canSail ? '可出航' : '不可出航'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {report.canSail
                      ? '当前方案满足所有航行条件'
                      : '存在影响航行的问题需要解决'}
                  </Text>
                </Stack>
              </Group>
            </Card>

            <Progress
              value={report.score}
              color={getScoreColor(report.score)}
              size="md"
            />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                安全评分
              </Text>
              <Badge color={getScoreColor(report.score)}>
                {report.score.toFixed(0)} / 100
              </Badge>
            </Group>
          </Stack>
        </Group>

        <Box p="sm" style={{ backgroundColor: '#f8f9fa', borderRadius: 8 }}>
          <Text size="sm" ta="center">
            {report.summary}
          </Text>
        </Box>

        <Group gap="sm">
          <Badge color="red">
            错误 {report.reasons.filter((r) => r.type === 'error').length}
          </Badge>
          <Badge color="yellow">
            警告 {report.reasons.filter((r) => r.type === 'warning').length}
          </Badge>
          <Badge color="blue">
            提示 {report.reasons.filter((r) => r.type === 'info').length}
          </Badge>
          <Badge color="green">
            通过 {report.reasons.filter((r) => r.type === 'success').length}
          </Badge>
        </Group>

        <ScrollArea.Autosize mah={320} type="hover">
          <Stack gap="sm">
            {sortedReasons.map((reason) => (
              <Card
                key={reason.id}
                padding="sm"
                withBorder
                style={{
                  backgroundColor: typeBgColors[reason.type],
                  borderColor: typeBorderColors[reason.type],
                  borderLeftWidth: 4,
                }}
              >
                <Stack gap={6}>
                  <Group gap="sm" align="flex-start">
                    {getTypeIcon(reason.type)}
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" fw={600}>
                          {reason.title}
                        </Text>
                        <Badge
                          color={typeColors[reason.type]}
                          size="sm"
                          variant="light"
                        >
                          {reason.type === 'error'
                            ? '错误'
                            : reason.type === 'warning'
                            ? '警告'
                            : reason.type === 'success'
                            ? '通过'
                            : '提示'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {reason.description}
                      </Text>
                      {reason.value !== undefined &&
                        reason.threshold !== undefined && (
                          <Group mt={4}>
                            <Text size="xs" c="dimmed">
                              当前值:
                              <Text
                                span
                                fw={600}
                                c={
                                  reason.type === 'error' ||
                                  reason.type === 'warning'
                                    ? 'red'
                                    : 'green'
                                }
                              >
                                {' '}
                                {reason.value.toFixed(2)}
                              </Text>
                            </Text>
                            <Text size="xs" c="dimmed">
                              阈值:
                              <Text span fw={600}>
                                {' '}
                                {reason.threshold.toFixed(2)}
                              </Text>
                            </Text>
                          </Group>
                        )}
                    </Stack>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Paper>
  );
};
