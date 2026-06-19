import React from 'react';
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Card,
  Button,
  Accordion,
  Progress,
  ActionIcon,
  ScrollArea,
} from '@mantine/core';
import {
  IconScale,
  IconWeight,
  IconArrowsMove,
  IconPlus,
  IconMinus,
  IconArrowRight,
  IconCheck,
  IconBulb,
} from '@tabler/icons-react';
import type { LoadingSuggestion } from '../types';

interface LoadingSuggestionPanelProps {
  suggestions: LoadingSuggestion[];
  onApplySuggestion?: (suggestion: LoadingSuggestion) => void;
}

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const priorityColors: Record<string, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const typeIcons: Record<string, React.ReactNode> = {
  balance: <IconScale size={18} />,
  weight: <IconWeight size={18} />,
  position: <IconArrowsMove size={18} />,
  add: <IconPlus size={18} />,
  remove: <IconMinus size={18} />,
};

const typeLabels: Record<string, string> = {
  balance: '平衡',
  weight: '重量',
  position: '位置',
  add: '添加',
  remove: '移除',
};

export const LoadingSuggestionPanel: React.FC<LoadingSuggestionPanelProps> = ({
  suggestions,
  onApplySuggestion,
}) => {
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const getImprovementColor = (value: number) => {
    if (value >= 70) return 'green';
    if (value >= 40) return 'yellow';
    return 'blue';
  };

  return (
    <Paper p="md" shadow="sm" radius="md">
      <Group justify="space-between" mb="md">
        <Title order={4}>
          <Group gap="xs">
            <IconBulb size={20} />
            智能装载建议
            <Badge size="sm" variant="light">
              {suggestions.length} 条
            </Badge>
          </Group>
        </Title>
      </Group>

      <ScrollArea h={400}>
        <Stack gap="xs">
          {sortedSuggestions.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              暂无装载建议
            </Text>
          )}

          {sortedSuggestions.map((suggestion) => (
            <Card key={suggestion.id} padding="sm" withBorder>
              <Group justify="space-between" align="flex-start">
                <Group gap="xs" align="flex-start" style={{ flex: 1 }}>
                  <div
                    style={{
                      width: 6,
                      height: '100%',
                      minHeight: 60,
                      borderRadius: 3,
                      backgroundColor:
                        suggestion.priority === 'high'
                          ? '#fa5252'
                          : suggestion.priority === 'medium'
                          ? '#fcc419'
                          : '#40c057',
                      flexShrink: 0,
                    }}
                  />
                  <Group gap="xs" align="center">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color={priorityColors[suggestion.priority]}
                    >
                      {typeIcons[suggestion.type]}
                    </ActionIcon>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {suggestion.title}
                        </Text>
                        <Badge
                          size="xs"
                          color={priorityColors[suggestion.priority]}
                          variant="light"
                        >
                          {priorityLabels[suggestion.priority]}优先级
                        </Badge>
                        <Badge size="xs" variant="outline">
                          {typeLabels[suggestion.type]}
                        </Badge>
                      </Group>

                      <Accordion variant="separated" chevronSize={14}>
                        <Accordion.Item value={suggestion.id}>
                          <Accordion.Control>
                            <Text size="xs" c="dimmed">
                              查看详情
                            </Text>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="xs">
                              <Text size="sm">{suggestion.description}</Text>

                              {suggestion.fromX !== undefined &&
                                suggestion.fromY !== undefined &&
                                suggestion.toX !== undefined &&
                                suggestion.toY !== undefined && (
                                  <Group gap="xs">
                                    <Badge size="sm" variant="light">
                                      ({suggestion.fromX.toFixed(1)},{' '}
                                      {suggestion.fromY.toFixed(1)})
                                    </Badge>
                                    <IconArrowRight size={14} />
                                    <Badge size="sm" color="green" variant="light">
                                      ({suggestion.toX.toFixed(1)},{' '}
                                      {suggestion.toY.toFixed(1)})
                                    </Badge>
                                  </Group>
                                )}

                              <Stack gap={4}>
                                <Group justify="space-between">
                                  <Text size="xs" c="dimmed">
                                    预期提升
                                  </Text>
                                  <Text size="xs" fw={500}>
                                    {suggestion.expectedImprovement.toFixed(0)} 分
                                  </Text>
                                </Group>
                                <Progress
                                  value={suggestion.expectedImprovement}
                                  size="sm"
                                  color={getImprovementColor(
                                    suggestion.expectedImprovement
                                  )}
                                />
                              </Stack>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </Stack>
                  </Group>
                </Group>

                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => onApplySuggestion?.(suggestion)}
                  disabled={!onApplySuggestion}
                >
                  应用
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
};
