import React, { useState } from 'react';
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Card,
  Button,
  Slider,
  Modal,
  TextInput,
  ActionIcon,
  ScrollArea,
  Menu,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconTrash,
  IconEdit,
  IconClock,
  IconVideo,
} from '@tabler/icons-react';
import type {
  PlaybackState,
  PlaybackFrame,
  RaftConfig,
  Cargo,
} from '../types';

interface Recording {
  id: string;
  name: string;
  createdAt: number;
  frames: PlaybackFrame[];
  config: RaftConfig;
  cargos: Cargo[];
}

interface PlaybackPanelProps {
  playbackState: PlaybackState;
  recordings: Recording[];
  onPlayRecording?: (recording: Recording) => void;
  onDeleteRecording?: (id: string) => void;
  onRenameRecording?: (id: string, newName: string) => void;
  onSeek?: (progress: number) => void;
  onSpeedChange?: (speed: number) => void;
  onPlayPause?: () => void;
  onStop?: () => void;
}

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

const speedOptions = [0.25, 0.5, 1, 2, 4];

export const PlaybackPanel: React.FC<PlaybackPanelProps> = ({
  playbackState,
  recordings,
  onPlayRecording,
  onDeleteRecording,
  onRenameRecording,
  onSeek,
  onSpeedChange,
  onPlayPause,
  onStop,
}) => {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { isPlaying, frames, currentFrameIndex, totalDuration, playbackSpeed } = playbackState;

  const currentTime =
    frames.length > 0 && currentFrameIndex < frames.length
      ? frames[currentFrameIndex].timestamp
      : 0;

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleRenameClick = (id: string, name: string) => {
    setRenameId(id);
    setRenameValue(name);
    setRenameModalOpen(true);
  };

  const handleRenameConfirm = () => {
    if (renameId && renameValue.trim() && onRenameRecording) {
      onRenameRecording(renameId, renameValue.trim());
    }
    setRenameModalOpen(false);
    setRenameId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenameModalOpen(false);
    setRenameId(null);
    setRenameValue('');
  };

  const getRecordingDuration = (recording: Recording): number => {
    if (recording.frames.length === 0) return 0;
    return recording.frames[recording.frames.length - 1].timestamp;
  };

  return (
    <>
      <Paper p="md" shadow="sm" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>
            <Group gap="xs">
              <IconVideo size={20} />
              回放控制
            </Group>
          </Title>
          {isPlaying && (
            <Badge color="green" variant="dot">
              播放中
            </Badge>
          )}
        </Group>

        {frames.length > 0 && (
          <Card withBorder padding="sm" mb="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {formatTime(currentTime)}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatTime(totalDuration)}
                </Text>
              </Group>

              <Slider
                value={progress}
                onChange={onSeek}
                min={0}
                max={100}
                step={0.1}
                size="sm"
              />

              <Group justify="center" gap="xs">
                <ActionIcon
                  size="lg"
                  variant="filled"
                  color={isPlaying ? 'yellow' : 'green'}
                  onClick={onPlayPause}
                >
                  {isPlaying ? (
                    <IconPlayerPause size={18} />
                  ) : (
                    <IconPlayerPlay size={18} />
                  )}
                </ActionIcon>
                <ActionIcon
                  size="lg"
                  variant="filled"
                  color="red"
                  onClick={onStop}
                >
                  <IconPlayerStop size={18} />
                </ActionIcon>
                <Menu shadow="md" width={120}>
                  <Menu.Target>
                    <Button size="sm" variant="light">
                      {playbackSpeed}x
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {speedOptions.map((speed) => (
                      <Menu.Item
                        key={speed}
                        onClick={() => onSpeedChange?.(speed)}
                        rightSection={
                          playbackSpeed === speed ? '✓' : null
                        }
                      >
                        {speed}x
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Stack>
          </Card>
        )}

        <Title order={5} mb="sm">
          录制列表
        </Title>
        <ScrollArea h={260}>
          <Stack gap="xs">
            {recordings.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                暂无录制记录
              </Text>
            )}
            {recordings.map((recording) => (
              <Card key={recording.id} padding="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconVideo size={16} color="#228be6" />
                    <Text size="sm" fw={500}>
                      {recording.name}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="green"
                      onClick={() => onPlayRecording?.(recording)}
                      title="播放"
                    >
                      <IconPlayerPlay size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="blue"
                      onClick={() => handleRenameClick(recording.id, recording.name)}
                      title="重命名"
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={() => onDeleteRecording?.(recording.id)}
                      title="删除"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Group mt="xs" gap="md">
                  <Group gap={4}>
                    <IconClock size={12} color="dimmed" />
                    <Text size="xs" c="dimmed">
                      {formatTime(getRecordingDuration(recording))}
                    </Text>
                  </Group>
                  <Badge size="sm" variant="light">
                    {recording.frames.length} 帧
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {new Date(recording.createdAt).toLocaleString('zh-CN')}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
      </Paper>

      <Modal
        opened={renameModalOpen}
        onClose={handleRenameCancel}
        title="重命名录制"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="录制名称"
            placeholder="请输入新名称"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleRenameCancel}>
              取消
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!renameValue.trim()}>
              确定
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
