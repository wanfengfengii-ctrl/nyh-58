import React from 'react';
import {
  Paper,
  Title,
  NumberInput,
  Slider,
  Group,
  Button,
  Stack,
  Text,
  Badge,
  ActionIcon,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconPackage,
} from '@tabler/icons-react';
import type { RaftConfig, Cargo } from '../types';
import { CARGO_COLORS, generateCargoId } from '../constants';
import { clampCargoToBounds, calculateRaftDimensions } from '../utils/raftGeometry';

interface ControlPanelProps {
  config: RaftConfig;
  onConfigChange: (config: RaftConfig) => void;
  cargos: Cargo[];
  onCargosChange: (cargos: Cargo[]) => void;
  selectedCargoId: string | null;
  onSelectedCargoChange: (id: string | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onConfigChange,
  cargos,
  onCargosChange,
  selectedCargoId,
  onSelectedCargoChange,
}) => {
  const updateConfig = (key: keyof RaftConfig, value: number) => {
    onConfigChange({ ...config, [key]: value });
  };

  const addCargo = () => {
    const dims = calculateRaftDimensions(config);
    const cargoWidth = 0.6;
    const cargoHeight = 0.8;
    
    const maxX = Math.max(0, dims.width / 2 - cargoWidth / 2);
    const maxY = Math.max(0, dims.height / 2 - cargoHeight / 2);
    
    const newCargo: Cargo = {
      id: generateCargoId(),
      name: `货物${cargos.length + 1}`,
      x: (Math.random() - 0.5) * Math.min(1, maxX * 2),
      y: (Math.random() - 0.5) * Math.min(2, maxY * 2),
      width: cargoWidth,
      height: cargoHeight,
      weight: 200,
      color: CARGO_COLORS[cargos.length % CARGO_COLORS.length],
    };
    
    const clamped = clampCargoToBounds(
      newCargo.x,
      newCargo.y,
      newCargo.width,
      newCargo.height,
      config
    );
    newCargo.x = clamped.x;
    newCargo.y = clamped.y;
    
    onCargosChange([...cargos, newCargo]);
    onSelectedCargoChange(newCargo.id);
  };

  const removeCargo = (id: string) => {
    onCargosChange(cargos.filter((c) => c.id !== id));
    if (selectedCargoId === id) {
      onSelectedCargoChange(null);
    }
  };

  const updateCargo = (id: string, updates: Partial<Cargo>) => {
    onCargosChange(
      cargos.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          const clamped = clampCargoToBounds(
            updated.x,
            updated.y,
            updated.width,
            updated.height,
            config
          );
          return { ...updated, x: clamped.x, y: clamped.y };
        }
        return c;
      })
    );
  };

  const selectedCargo = cargos.find((c) => c.id === selectedCargoId);

  return (
    <Stack gap="md">
      <Paper p="md" shadow="sm" radius="md">
        <Title order={4} mb="md">
          竹筏参数
        </Title>
        <Stack gap="sm">
          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">竹筒数量</Text>
              <Badge color="blue">{config.tubeCount} 根</Badge>
            </Group>
            <Slider
              value={config.tubeCount}
              onChange={(v) => updateConfig('tubeCount', v)}
              min={1}
              max={20}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 10, label: '10' },
                { value: 20, label: '20' },
              ]}
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">竹筒直径</Text>
              <Badge color="green">{config.tubeDiameter.toFixed(2)} m</Badge>
            </Group>
            <Slider
              value={config.tubeDiameter}
              onChange={(v) => updateConfig('tubeDiameter', v)}
              min={0.05}
              max={0.5}
              step={0.01}
              precision={2}
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">竹筒长度</Text>
              <Badge color="green">{config.tubeLength.toFixed(1)} m</Badge>
            </Group>
            <Slider
              value={config.tubeLength}
              onChange={(v) => updateConfig('tubeLength', v)}
              min={2}
              max={12}
              step={0.5}
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">竹筒间距</Text>
              <Badge color="green">{config.tubeSpacing.toFixed(3)} m</Badge>
            </Group>
            <Slider
              value={config.tubeSpacing}
              onChange={(v) => updateConfig('tubeSpacing', v)}
              min={0}
              max={0.3}
              step={0.01}
            />
          </div>
        </Stack>
      </Paper>

      <Paper p="md" shadow="sm" radius="md">
        <Title order={4} mb="md">
          环境参数
        </Title>
        <Stack gap="sm">
          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">水流速度</Text>
              <Badge color="cyan">{config.waterFlowSpeed.toFixed(1)} m/s</Badge>
            </Group>
            <Slider
              value={config.waterFlowSpeed}
              onChange={(v) => updateConfig('waterFlowSpeed', v)}
              min={0.1}
              max={10}
              step={0.1}
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">水的密度</Text>
              <Badge color="cyan">{config.waterDensity.toFixed(0)} kg/m³</Badge>
            </Group>
            <Slider
              value={config.waterDensity}
              onChange={(v) => updateConfig('waterDensity', v)}
              min={900}
              max={1100}
              step={10}
            />
          </div>

          <div>
            <Group justify="space-between" mb={5}>
              <Text size="sm">竹子密度</Text>
              <Badge color="lime">{config.tubeDensity.toFixed(0)} kg/m³</Badge>
            </Group>
            <Slider
              value={config.tubeDensity}
              onChange={(v) => updateConfig('tubeDensity', v)}
              min={200}
              max={700}
              step={10}
            />
          </div>
        </Stack>
      </Paper>

      <Paper p="md" shadow="sm" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>货物管理</Title>
          <Button
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={addCargo}
            color="blue"
          >
            添加货物
          </Button>
        </Group>

        <Stack gap="xs">
          {cargos.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              暂无货物，点击上方按钮添加
            </Text>
          )}
          {cargos.map((cargo) => (
            <Paper
              key={cargo.id}
              p="xs"
              withBorder
              style={{
                cursor: 'pointer',
                borderColor:
                  selectedCargoId === cargo.id ? '#228be6' : undefined,
                backgroundColor:
                  selectedCargoId === cargo.id ? '#e7f5ff' : undefined,
              }}
              onClick={() => onSelectedCargoChange(cargo.id)}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: cargo.color,
                    }}
                  />
                  <Text size="sm" fw={500}>
                    {cargo.name}
                  </Text>
                </Group>
                <Group gap="xs">
                  <Badge size="sm" variant="light">
                    {cargo.weight.toFixed(0)}N
                  </Badge>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCargo(cargo.id);
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Paper>

      {selectedCargo && (
        <Paper p="md" shadow="sm" radius="md" withBorder color="blue">
          <Group mb="md">
            <IconPackage size={18} />
            <Title order={5}>编辑货物: {selectedCargo.name}</Title>
          </Group>
          <Stack gap="sm">
            <NumberInput
              label="名称"
              value={selectedCargo.name}
              onChange={(v) =>
                updateCargo(selectedCargo.id, { name: String(v || '') })
              }
              size="sm"
            />
            <NumberInput
              label="重量 (N)"
              value={selectedCargo.weight}
              onChange={(v) =>
                updateCargo(selectedCargo.id, {
                  weight: Math.max(1, Number(v) || 1),
                })
              }
              min={1}
              size="sm"
            />
            <div>
              <Text size="sm" mb={5}>
                宽度 (m)
              </Text>
              <Slider
                value={selectedCargo.width}
                onChange={(v) =>
                  updateCargo(selectedCargo.id, { width: v })
                }
                min={0.2}
                max={2}
                step={0.1}
              />
            </div>
            <div>
              <Text size="sm" mb={5}>
                高度 (m)
              </Text>
              <Slider
                value={selectedCargo.height}
                onChange={(v) =>
                  updateCargo(selectedCargo.id, { height: v })
                }
                min={0.2}
                max={3}
                step={0.1}
              />
            </div>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};
