import React from 'react';
import {
  Paper,
  Title,
  Slider,
  Group,
  Button,
  Stack,
  Text,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconRefresh,
  IconVideo,
  IconWaveSawTool,
} from '@tabler/icons-react';
import type { WaterFlowMode } from '../types';

interface PhysicsControlPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onReset: () => void;
  onRecord: () => void;
  onStopRecord: () => void;
  isRecording: boolean;
  waterFlowMode: WaterFlowMode;
  onWaterFlowModeChange: (mode: WaterFlowMode) => void;
  waterFlowSpeed: number;
  onWaterFlowSpeedChange: (speed: number) => void;
  pulseIntensity?: number;
  onPulseIntensityChange?: (intensity: number) => void;
  pulseFrequency?: number;
  onPulseFrequencyChange?: (frequency: number) => void;
}

export const PhysicsControlPanel: React.FC<PhysicsControlPanelProps> = ({
  isRunning,
  onStart,
  onStop,
  onPause,
  onReset,
  onRecord,
  onStopRecord,
  isRecording,
  waterFlowMode,
  onWaterFlowModeChange,
  waterFlowSpeed,
  onWaterFlowSpeedChange,
  pulseIntensity,
  onPulseIntensityChange,
  pulseFrequency,
  onPulseFrequencyChange,
}) => {
  return (
    <Stack gap="md">
      <Paper p="md" shadow="sm" radius="md">
        <Title order={4} mb="md">
          物理仿真控制
        </Title>
        <Stack gap="sm">
          <Group gap="xs" mb="md">
            <Text size="sm" fw={500}>
              当前状态:
            </Text>
            <Badge color={isRunning ? 'green' : 'gray'}>
              {isRunning ? '运行中' : '已停止'}
            </Badge>
            {isRecording && (
              <Badge color="red" variant="dot">
                录制中
              </Badge>
            )}
            <Badge color="cyan">
              {waterFlowMode === 'steady' && '平稳水流'}
              {waterFlowMode === 'pulse' && '脉冲水流'}
              {waterFlowMode === 'random' && '随机水流'}
            </Badge>
          </Group>

          <Group gap="xs" justify="center" mb="md">
            {!isRunning ? (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={onStart}
                color="green"
                size="sm"
              >
                开始
              </Button>
            ) : (
              <Button
                leftSection={<IconPlayerPause size={16} />}
                onClick={onPause}
                color="yellow"
                size="sm"
              >
                暂停
              </Button>
            )}
            <Button
              leftSection={<IconPlayerStop size={16} />}
              onClick={onStop}
              color="red"
              size="sm"
            >
              停止
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={onReset}
              color="blue"
              size="sm"
            >
              重置
            </Button>
            {!isRecording ? (
              <Button
                leftSection={<IconVideo size={16} />}
                onClick={onRecord}
                color="red"
                variant="light"
                size="sm"
              >
                录制
              </Button>
            ) : (
              <Button
                leftSection={<IconVideo size={16} />}
                onClick={onStopRecord}
                color="red"
                size="sm"
              >
                停止录制
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" shadow="sm" radius="md">
        <Group mb="md">
          <IconWaveSawTool size={18} />
          <Title order={4}>水流设置</Title>
        </Group>
        <Stack gap="sm">
          <div>
            <Text size="sm" mb={5}>
              水流模式
            </Text>
            <SegmentedControl
              value={waterFlowMode}
              onChange={(value) =>
                onWaterFlowModeChange(value as WaterFlowMode)
              }
              data={[
                { value: 'steady', label: '平稳' },
                { value: 'pulse', label: '脉冲' },
                { value: 'random', label: '随机' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">水流速度</Text>
              <Badge color="cyan">{waterFlowSpeed.toFixed(1)} m/s</Badge>
            </Group>
            <Slider
              value={waterFlowSpeed}
              onChange={onWaterFlowSpeedChange}
              min={0.1}
              max={10}
              step={0.1}
              marks={[
                { value: 0.1, label: '0.1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
            />
          </div>

          {waterFlowMode === 'pulse' && pulseIntensity !== undefined && (
            <div>
              <Group justify="space-between" mb={5}>
                <Text size="sm">脉冲强度</Text>
                <Badge color="orange">{pulseIntensity.toFixed(1)}</Badge>
              </Group>
              <Slider
                value={pulseIntensity}
                onChange={onPulseIntensityChange}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>
          )}

          {waterFlowMode === 'pulse' && pulseFrequency !== undefined && (
            <div>
              <Group justify="space-between" mb={5}>
                <Text size="sm">脉冲频率</Text>
                <Badge color="grape">{pulseFrequency.toFixed(1)} Hz</Badge>
              </Group>
              <Slider
                value={pulseFrequency}
                onChange={onPulseFrequencyChange}
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
};
