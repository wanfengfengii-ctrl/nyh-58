import React, { useState } from 'react';
import {
  Paper,
  Title,
  Button,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Table,
  Card,
  ScrollArea,
} from '@mantine/core';
import {
  IconDeviceFloppy,
  IconTrash,
  IconEye,
  IconCheck,
  IconX,
  IconFileDescription,
  IconGitCompare,
} from '@tabler/icons-react';
import type { SavedScheme, RaftConfig, Cargo, BuoyancyResult, StabilityResult } from '../types';

interface SchemeManagerProps {
  schemes: SavedScheme[];
  onSchemesChange: (schemes: SavedScheme[]) => void;
  currentConfig: RaftConfig;
  currentCargos: Cargo[];
  currentBuoyancy: BuoyancyResult;
  currentStability: StabilityResult;
  onLoadScheme: (scheme: SavedScheme) => void;
  isValid: boolean;
}

export const SchemeManager: React.FC<SchemeManagerProps> = ({
  schemes,
  onSchemesChange,
  currentConfig,
  currentCargos,
  currentBuoyancy,
  currentStability,
  onLoadScheme,
  isValid,
}) => {
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const handleSave = () => {
    if (!schemeName.trim()) return;

    const newScheme: SavedScheme = {
      id: `scheme-${Date.now()}`,
      name: schemeName.trim(),
      createdAt: Date.now(),
      config: { ...currentConfig },
      cargos: currentCargos.map((c) => ({ ...c })),
      buoyancy: { ...currentBuoyancy },
      stability: { ...currentStability },
    };

    onSchemesChange([...schemes, newScheme]);
    setSchemeName('');
    setSaveModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onSchemesChange(schemes.filter((s) => s.id !== id));
    setSelectedForCompare(selectedForCompare.filter((s) => s !== id));
  };

  const handleLoad = (scheme: SavedScheme) => {
    onLoadScheme(scheme);
  };

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((s) => s !== id));
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const openCompare = () => {
    if (selectedForCompare.length >= 2) {
      setCompareModalOpen(true);
    }
  };

  const compareSchemes = schemes.filter((s) =>
    selectedForCompare.includes(s.id)
  );

  return (
    <>
      <Paper p="md" shadow="sm" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>
            <Group gap="xs">
              <IconFileDescription size={20} />
              装载方案
            </Group>
          </Title>
          <Group gap="xs">
            {selectedForCompare.length >= 2 && (
              <Button
                size="sm"
                variant="light"
                leftSection={<IconGitCompare size={16} />}
                onClick={openCompare}
              >
                对比 ({selectedForCompare.length})
              </Button>
            )}
            <Button
              size="sm"
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={() => setSaveModalOpen(true)}
              disabled={!isValid}
            >
              保存方案
            </Button>
          </Group>
        </Group>

        <ScrollArea h={260}>
          <Stack gap="xs">
            {schemes.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                暂无保存的方案
              </Text>
            )}
            {schemes.map((scheme) => (
              <Card
                key={scheme.id}
                padding="sm"
                withBorder
                style={{
                  borderColor: selectedForCompare.includes(scheme.id)
                    ? '#228be6'
                    : undefined,
                  backgroundColor: selectedForCompare.includes(scheme.id)
                    ? '#e7f5ff'
                    : undefined,
                }}
              >
                <Group justify="space-between">
                  <Group gap="xs">
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: scheme.stability.isSailable
                          ? '#40c057'
                          : '#fa5252',
                      }}
                    />
                    <Text size="sm" fw={500}>
                      {scheme.name}
                    </Text>
                    <Badge size="sm" variant="light">
                      {scheme.cargos.length} 件货物
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color={selectedForCompare.includes(scheme.id) ? 'blue' : 'gray'}
                      onClick={() => toggleCompare(scheme.id)}
                      title="加入对比"
                    >
                      <IconGitCompare size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="green"
                      onClick={() => handleLoad(scheme)}
                      title="加载方案"
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(scheme.id)}
                      title="删除方案"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Group mt="xs" gap="md">
                  <Text size="xs" c="dimmed">
                    稳定性: {scheme.stability.stabilityScore.toFixed(0)}分
                  </Text>
                  <Text size="xs" c="dimmed">
                    载重: {(scheme.buoyancy.loadRatio * 100).toFixed(1)}%
                  </Text>
                  <Badge
                    size="sm"
                    color={scheme.stability.isSailable ? 'green' : 'red'}
                    variant="light"
                  >
                    {scheme.stability.isSailable ? '可出航' : '不可出航'}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>

        {selectedForCompare.length > 0 && selectedForCompare.length < 2 && (
          <Text size="xs" c="dimmed" ta="center" mt="sm">
            请选择至少 2 个方案进行对比
          </Text>
        )}
      </Paper>

      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="保存装载方案"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="方案名称"
            placeholder="请输入方案名称"
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            autoFocus
          />
          {!isValid && (
            <Text size="sm" c="red">
              当前方案无效，无法保存
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSaveModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!schemeName.trim() || !isValid}>
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="方案对比"
        size="xl"
        centered
      >
        <ScrollArea>
          <Table striped>
            <thead>
              <tr>
                <th>指标</th>
                {compareSchemes.map((s) => (
                  <th key={s.id}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>竹筒数量</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{s.config.tubeCount} 根</td>
                ))}
              </tr>
              <tr>
                <td>水流速度</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{s.config.waterFlowSpeed.toFixed(1)} m/s</td>
                ))}
              </tr>
              <tr>
                <td>货物数量</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{s.cargos.length} 件</td>
                ))}
              </tr>
              <tr>
                <td>总重量</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{s.buoyancy.totalWeight.toFixed(1)} N</td>
                ))}
              </tr>
              <tr>
                <td>总浮力</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{s.buoyancy.totalBuoyancy.toFixed(1)} N</td>
                ))}
              </tr>
              <tr>
                <td>载重比例</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>
                    <Badge
                      color={s.buoyancy.loadRatio > 0.85 ? 'red' : s.buoyancy.loadRatio > 0.6 ? 'yellow' : 'green'}
                    >
                      {(s.buoyancy.loadRatio * 100).toFixed(1)}%
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td>吃水深度</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>{(s.buoyancy.draftDepth * 100).toFixed(1)} cm</td>
                ))}
              </tr>
              <tr>
                <td>稳定性评分</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>
                    <Badge
                      color={s.stability.stabilityScore > 70 ? 'green' : s.stability.stabilityScore > 40 ? 'yellow' : 'red'}
                    >
                      {s.stability.stabilityScore.toFixed(0)} 分
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td>倾斜风险</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>
                    <Badge color={s.stability.tiltRisk === 'low' ? 'green' : s.stability.tiltRisk === 'medium' ? 'yellow' : 'red'}>
                      {s.stability.tiltRisk === 'low' ? '低' : s.stability.tiltRisk === 'medium' ? '中' : '高'}
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td>可出航</td>
                {compareSchemes.map((s) => (
                  <td key={s.id}>
                    {s.stability.isSailable ? (
                      <Badge color="green" leftSection={<IconCheck size={10} />}>
                        是
                      </Badge>
                    ) : (
                      <Badge color="red" leftSection={<IconX size={10} />}>
                        否
                      </Badge>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </Table>
        </ScrollArea>
      </Modal>
    </>
  );
};
