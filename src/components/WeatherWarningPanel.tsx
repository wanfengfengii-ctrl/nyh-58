import React from 'react';
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
  SegmentedControl,
  Progress,
  Divider,
  Alert,
  Grid,
} from '@mantine/core';
import {
  IconSun,
  IconCloud,
  IconCloudFog,
  IconCloudStorm,
  IconWind,
  IconDroplet,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconRefresh,
  IconArrowRight,
  IconAlertCircle,
  IconShield,
} from '@tabler/icons-react';
import type {
  WeatherWaterConfig,
  WeatherReport,
  WeatherCondition,
  WaterCondition,
  WindCondition,
  WeatherPreset,
} from '../types';
import {
  WEATHER_PRESETS,
  WEATHER_LABELS,
  RISK_LABELS,
  RISK_COLORS,
  RISK_BG_COLORS,
  RISK_BORDER_COLORS,
} from '../constants';

interface WeatherWarningPanelProps {
  config: WeatherWaterConfig;
  onConfigChange: (config: WeatherWaterConfig) => void;
  weatherReport: WeatherReport | null;
  onRefresh?: () => void;
}

const weatherOptions: Array<{ value: WeatherCondition; label: string; icon: React.ReactNode }> = [
  { value: 'sunny', label: '晴天', icon: <IconSun size={16} /> },
  { value: 'cloudy', label: '阴天', icon: <IconCloud size={16} /> },
  { value: 'rainy', label: '下雨', icon: <IconCloudFog size={16} /> },
  { value: 'stormy', label: '暴风雨', icon: <IconCloudStorm size={16} /> },
];

const waterOptions: Array<{ value: WaterCondition; label: string; icon: React.ReactNode }> = [
  { value: 'calm', label: '平静', icon: <IconDroplet size={16} /> },
  { value: 'ripple', label: '微波', icon: <IconDroplet size={16} /> },
  { value: 'rapid', label: '急流', icon: <IconDroplet size={16} /> },
  { value: 'torrent', label: '洪峰', icon: <IconDroplet size={16} /> },
];

const windOptions: Array<{ value: WindCondition; label: string; icon: React.ReactNode }> = [
  { value: 'calm', label: '无风', icon: <IconWind size={16} /> },
  { value: 'breeze', label: '微风', icon: <IconWind size={16} /> },
  { value: 'windy', label: '大风', icon: <IconWind size={16} /> },
  { value: 'strong', label: '强风', icon: <IconWind size={16} /> },
];

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

const priorityColors = {
  high: 'red',
  medium: 'yellow',
  low: 'blue',
};

const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

export const WeatherWarningPanel: React.FC<WeatherWarningPanelProps> = ({
  config,
  onConfigChange,
  weatherReport,
  onRefresh,
}) => {
  const updateWeather = (weather: WeatherCondition) => {
    onConfigChange({ ...config, weather });
  };

  const updateWater = (water: WaterCondition) => {
    onConfigChange({ ...config, water });
  };

  const updateWind = (wind: WindCondition) => {
    onConfigChange({ ...config, wind });
  };

  const applyPreset = (preset: WeatherPreset) => {
    onConfigChange({ ...preset.config });
  };

  const getTypeIcon = (type: 'error' | 'warning' | 'info' | 'success') => {
    switch (type) {
      case 'success':
        return <IconCheck size={18} color={typeBorderColors[type]} />;
      case 'warning':
        return <IconAlertTriangle size={18} color={typeBorderColors[type]} />;
      case 'error':
        return <IconX size={18} color={typeBorderColors[type]} />;
      case 'info':
        return <IconInfoCircle size={18} color={typeBorderColors[type]} />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const sortedWarnings = weatherReport
    ? [...weatherReport.warnings].sort(
        (a, b) => typeOrder[a.type] - typeOrder[b.type]
      )
    : [];

  const sortedRecommendations = weatherReport
    ? [...weatherReport.recommendations].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
    : [];

  const getPresetButtonColor = (preset: WeatherPreset) => {
    if (
      preset.config.weather === config.weather &&
      preset.config.water === config.water &&
      preset.config.wind === config.wind
    ) {
      return RISK_COLORS[preset.riskLevel];
    }
    return 'default';
  };

  if (!weatherReport) {
    return (
      <Paper p="md" shadow="sm" radius="md">
        <Stack align="center" justify="center" py="xl" gap="md">
          <IconCloudStorm size={48} color="#adb5bd" />
          <Text c="dimmed" ta="center">
            暂无天气水况数据
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            请先配置天气和水况参数，系统将自动生成预警报告
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md" shadow="sm" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconCloudStorm size={22} color="#228be6" />
            <Title order={4}>天气与水况预警</Title>
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

        <Card
          padding="md"
          withBorder
          style={{
            backgroundColor: RISK_BG_COLORS[weatherReport.riskLevel],
            borderColor: RISK_BORDER_COLORS[weatherReport.riskLevel],
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Group gap="sm">
                {weatherReport.canSail ? (
                  <IconShield size={28} color={RISK_BORDER_COLORS.safe} />
                ) : (
                  <IconAlertCircle size={28} color={RISK_BORDER_COLORS.danger} />
                )}
                <Stack gap={2}>
                  <Text size="lg" fw={700} c={RISK_BORDER_COLORS[weatherReport.riskLevel]}>
                    {weatherReport.canSail ? '可出航' : '不可出航'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    风险等级: {RISK_LABELS[weatherReport.riskLevel]}
                  </Text>
                </Stack>
              </Group>
              <Text size="sm" mt="xs">
                {weatherReport.summary}
              </Text>
            </Stack>
            <Stack gap="xs" align="center">
              <Text size="xs" c="dimmed">
                环境安全分
              </Text>
              <Text
                size="xl"
                fw={700}
                c={RISK_BORDER_COLORS[getRiskScoreColor(weatherReport.riskScore)]}
              >
                {weatherReport.riskScore.toFixed(0)}
              </Text>
              <Progress
                value={weatherReport.riskScore}
                color={getRiskScoreColor(weatherReport.riskScore)}
                size="sm"
                style={{ width: 80 }}
              />
            </Stack>
          </Group>
        </Card>

        <Card padding="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={5}>快速切换环境方案</Title>
            <Badge color="blue" variant="light">
              一键切换
            </Badge>
          </Group>
          <Stack gap="xs">
            {WEATHER_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant={
                  preset.config.weather === config.weather &&
                  preset.config.water === config.water &&
                  preset.config.wind === config.wind
                    ? 'filled'
                    : 'light'
                }
                color={getPresetButtonColor(preset)}
                onClick={() => applyPreset(preset)}
                justify="space-between"
                leftSection={<Text size="xl">{preset.icon}</Text>}
                rightSection={
                  <Group gap="xs">
                    <Badge size="sm" color={RISK_COLORS[preset.riskLevel]} variant="light">
                      {RISK_LABELS[preset.riskLevel]}
                    </Badge>
                    <IconArrowRight size={14} />
                  </Group>
                }
                fullWidth
                size="md"
              >
                <Stack gap={0} align="flex-start">
                  <Text size="sm" fw={500}>
                    {preset.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {preset.description}
                  </Text>
                </Stack>
              </Button>
            ))}
          </Stack>
        </Card>

        <Divider label="自定义环境参数" labelPosition="center" />

        <Stack gap="sm">
          <div>
            <Group justify="space-between" mb={8}>
              <Group gap="xs">
                <IconSun size={16} color="#f59f00" />
                <Text size="sm" fw={500}>
                  天气状况
                </Text>
              </Group>
              <Badge color="orange" variant="light">
                {WEATHER_LABELS[config.weather]}
              </Badge>
            </Group>
            <SegmentedControl
              value={config.weather}
              onChange={(value) => updateWeather(value as WeatherCondition)}
              data={weatherOptions.map((opt) => ({
                value: opt.value,
                label: (
                  <Group gap={4} justify="center">
                    {opt.icon}
                    <Text size="xs">{opt.label}</Text>
                  </Group>
                ),
              }))}
              fullWidth
              size="sm"
            />
          </div>

          <div>
            <Group justify="space-between" mb={8}>
              <Group gap="xs">
                <IconDroplet size={16} color="#228be6" />
                <Text size="sm" fw={500}>
                  水况
                </Text>
              </Group>
              <Badge color="cyan" variant="light">
                {WEATHER_LABELS[config.water]}
              </Badge>
            </Group>
            <SegmentedControl
              value={config.water}
              onChange={(value) => updateWater(value as WaterCondition)}
              data={waterOptions.map((opt) => ({
                value: opt.value,
                label: (
                  <Group gap={4} justify="center">
                    {opt.icon}
                    <Text size="xs">{opt.label}</Text>
                  </Group>
                ),
              }))}
              fullWidth
              size="sm"
            />
          </div>

          <div>
            <Group justify="space-between" mb={8}>
              <Group gap="xs">
                <IconWind size={16} color="#495057" />
                <Text size="sm" fw={500}>
                  风力
                </Text>
              </Group>
              <Badge color="gray" variant="light">
                {WEATHER_LABELS[config.wind]}
              </Badge>
            </Group>
            <SegmentedControl
              value={config.wind}
              onChange={(value) => updateWind(value as WindCondition)}
              data={windOptions.map((opt) => ({
                value: opt.value,
                label: (
                  <Group gap={4} justify="center">
                    {opt.icon}
                    <Text size="xs">{opt.label}</Text>
                  </Group>
                ),
              }))}
              fullWidth
              size="sm"
            />
          </div>
        </Stack>

        <Card padding="md" withBorder>
          <Title order={5} mb="md">环境影响参数</Title>
          <Grid columns={2} gap="md">
            <div>
              <Text size="xs" c="dimmed" mb={2}>水流速度倍率</Text>
              <Text size="lg" fw={700}>
                {weatherReport.effects.flowSpeedMultiplier.toFixed(2)}x
              </Text>
              <Progress
                value={Math.min(weatherReport.effects.flowSpeedMultiplier * 25, 100)}
                color={weatherReport.effects.flowSpeedMultiplier > 1.5 ? 'red' : weatherReport.effects.flowSpeedMultiplier > 1.2 ? 'yellow' : 'green'}
                size="sm"
                mt={4}
              />
            </div>
            <div>
              <Text size="xs" c="dimmed" mb={2}>稳定性惩罚</Text>
              <Text size="lg" fw={700} c={weatherReport.effects.stabilityPenalty > 20 ? 'red' : weatherReport.effects.stabilityPenalty > 10 ? 'yellow' : 'green'}>
                -{weatherReport.effects.stabilityPenalty.toFixed(0)} 分
              </Text>
              <Progress
                value={Math.min(weatherReport.effects.stabilityPenalty * 2, 100)}
                color={weatherReport.effects.stabilityPenalty > 20 ? 'red' : weatherReport.effects.stabilityPenalty > 10 ? 'yellow' : 'green'}
                size="sm"
                mt={4}
              />
            </div>
            <div>
              <Text size="xs" c="dimmed" mb={2}>浪高</Text>
              <Text size="lg" fw={700}>
                {weatherReport.effects.waveHeight.toFixed(2)} m
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" mb={2}>能见度</Text>
              <Text size="lg" fw={700} c={weatherReport.effects.visibility < 0.5 ? 'red' : weatherReport.effects.visibility < 0.8 ? 'yellow' : 'green'}>
                {(weatherReport.effects.visibility * 100).toFixed(0)}%
              </Text>
            </div>
          </Grid>
        </Card>

        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="实时联动说明"
          color="blue"
          variant="light"
        >
          <Text size="xs">
            天气和水况参数会实时影响水流速度、稳定性评分和出航建议。调整参数后，系统会自动重新计算所有相关指标。
          </Text>
        </Alert>

        <Divider label="预警原因" labelPosition="center" />

        <ScrollArea.Autosize mah={200} type="hover">
          <Stack gap="xs">
            {sortedWarnings.map((warning) => (
              <Card
                key={warning.id}
                padding="sm"
                withBorder
                style={{
                  backgroundColor: typeBgColors[warning.type],
                  borderColor: typeBorderColors[warning.type],
                  borderLeftWidth: 4,
                }}
              >
                <Group gap="sm" align="flex-start">
                  {getTypeIcon(warning.type)}
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {warning.title}
                      </Text>
                      <Badge
                        color={typeColors[warning.type]}
                        size="sm"
                        variant="light"
                      >
                        {warning.type === 'error'
                          ? '错误'
                          : warning.type === 'warning'
                          ? '警告'
                          : warning.type === 'success'
                          ? '通过'
                          : '提示'}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {warning.description}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Divider label="推荐操作" labelPosition="center" />

        <ScrollArea.Autosize mah={200} type="hover">
          <Stack gap="xs">
            {sortedRecommendations.map((rec) => (
              <Card
                key={rec.id}
                padding="sm"
                withBorder
                style={{
                  backgroundColor: rec.priority === 'high' ? '#fff5f5' : rec.priority === 'medium' ? '#fff9db' : '#e7f5ff',
                  borderColor: rec.priority === 'high' ? '#fa5252' : rec.priority === 'medium' ? '#fab005' : '#228be6',
                  borderLeftWidth: 4,
                }}
              >
                <Group gap="sm" align="flex-start">
                  <IconAlertTriangle
                    size={18}
                    color={rec.priority === 'high' ? '#fa5252' : rec.priority === 'medium' ? '#fab005' : '#228be6'}
                  />
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {rec.action}
                      </Text>
                      <Badge
                        color={priorityColors[rec.priority]}
                        size="sm"
                        variant="light"
                      >
                        {priorityLabels[rec.priority]}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {rec.description}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Paper>
  );
};
