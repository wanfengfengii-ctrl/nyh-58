import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  AppShell,
  Title,
  Container,
  Grid,
  Group,
  Text,
  Badge,
  Tabs,
  Stack,
  Divider,
  Box,
} from '@mantine/core';
import { IconShip } from '@tabler/icons-react';
import type { RaftConfig, Cargo, SavedScheme, PhysicsState, SailingReport, LoadingSuggestion, PlaybackState, PlaybackFrame, WaterFlowMode, WeatherReport, WeatherWaterConfig } from './types';
import { DEFAULT_CONFIG, DEFAULT_CARGOS } from './constants';
import { calculateBuoyancy, calculateStability, validateConfig, validateCargos } from './utils/physics';
import { clampCargoToBounds, clampAllCargosToBounds, areAllCargosWithinBounds, getOutOfBoundsCargos } from './utils/raftGeometry';
import { RaftPhysicsEngine } from './utils/physicsEngine';
import { WaterFlowSystem } from './utils/waterFlow';
import { generateSailingReport } from './utils/sailingReport';
import { generateLoadingSuggestions } from './utils/loadingSuggestion';
import { PlaybackManager } from './utils/playback';
import { StorageManager } from './utils/storage';
import { generateWeatherReport, getAdjustedStability } from './utils/weatherWater';
import { RaftTopView } from './components/RaftTopView';
import { RaftSideView } from './components/RaftSideView';
import { ControlPanel } from './components/ControlPanel';
import { DataPanel } from './components/DataPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { SchemeManager } from './components/SchemeManager';
import { PhysicsControlPanel } from './components/PhysicsControlPanel';
import { SailingReportPanel } from './components/SailingReportPanel';
import { LoadingSuggestionPanel } from './components/LoadingSuggestionPanel';
import { PlaybackPanel } from './components/PlaybackPanel';
import { WeatherWarningPanel } from './components/WeatherWarningPanel';

const storageManager = new StorageManager();
const playbackManager = new PlaybackManager();

function App() {
  const [config, setConfig] = useState<RaftConfig>(DEFAULT_CONFIG);
  const [cargos, setCargos] = useState<Cargo[]>(DEFAULT_CARGOS);
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);
  const [activeTab, setActiveTab] = useState<string>('simulation');

  const [physicsState, setPhysicsState] = useState<PhysicsState | null>(null);
  const [physicsRunning, setPhysicsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(playbackManager.getState());
  const [playbackRecordings, setPlaybackRecordings] = useState<Array<{
    id: string;
    name: string;
    createdAt: number;
    frames: PlaybackFrame[];
    config: RaftConfig;
    cargos: Cargo[];
  }>>([]);
  const [playbackCargos, setPlaybackCargos] = useState<Cargo[] | null>(null);
  const [playbackFrame, setPlaybackFrame] = useState<PlaybackFrame | null>(null);
  const [physicsCargos, setPhysicsCargos] = useState<Cargo[] | null>(null);

  const [sailingReport, setSailingReport] = useState<SailingReport | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState<LoadingSuggestion[]>([]);
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(null);

  const physicsEngineRef = useRef<RaftPhysicsEngine | null>(null);
  const waterFlowSystemRef = useRef<WaterFlowSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const saved = storageManager.loadSchemes();
    const recordings = storageManager.loadPlaybacks();
    setSavedSchemes(saved);
    setPlaybackRecordings(recordings);

    physicsEngineRef.current = new RaftPhysicsEngine(DEFAULT_CONFIG);
    waterFlowSystemRef.current = new WaterFlowSystem(DEFAULT_CONFIG);

    cargos.forEach((cargo) => {
      physicsEngineRef.current?.addCargo(cargo);
    });

    return () => {
      physicsEngineRef.current?.destroy();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.updateConfig(config);
    }
    if (waterFlowSystemRef.current) {
      waterFlowSystemRef.current.updateConfig(config);
    }
  }, [config]);

  useEffect(() => {
    setCargos((prev) => clampAllCargosToBounds(prev, config));
  }, [config.tubeCount, config.tubeDiameter, config.tubeLength, config.tubeSpacing]);

  useEffect(() => {
    if (!physicsEngineRef.current || playbackState.isPlaying) return;

    const currentCargoIds = new Set(cargos.map((c) => c.id));
    const engineCargos = physicsEngineRef.current.getCurrentCargos();
    const engineCargoIds = new Set(engineCargos.map((c) => c.id));

    cargos.forEach((cargo) => {
      if (!engineCargoIds.has(cargo.id)) {
        physicsEngineRef.current?.addCargo(cargo);
      } else {
        const existing = engineCargos.find((c) => c.id === cargo.id);
        if (existing && (existing.x !== cargo.x || existing.y !== cargo.y || existing.weight !== cargo.weight || existing.width !== cargo.width || existing.height !== cargo.height)) {
          physicsEngineRef.current?.updateCargo(cargo.id, cargo);
        }
      }
    });

    engineCargos.forEach((cargo) => {
      if (!currentCargoIds.has(cargo.id)) {
        physicsEngineRef.current?.removeCargo(cargo.id);
      }
    });
  }, [cargos, playbackState.isPlaying]);

  const buoyancy = useMemo(
    () => calculateBuoyancy(config, cargos),
    [config, cargos]
  );

  const baseStability = useMemo(
    () => calculateStability(config, cargos, buoyancy),
    [config, cargos, buoyancy]
  );

  const stability = useMemo(
    () => {
      if (!weatherReport) {
        const allInBounds = areAllCargosWithinBounds(cargos, config);
        return {
          ...baseStability,
          isSailable: baseStability.isSailable && allInBounds,
        };
      }
      const adjustedStability = getAdjustedStability(baseStability, weatherReport);
      const allInBounds = areAllCargosWithinBounds(cargos, config);
      return {
        ...adjustedStability,
        isSailable: adjustedStability.isSailable && allInBounds,
      };
    },
    [config, cargos, baseStability, weatherReport]
  );

  const allCargosInBounds = useMemo(
    () => areAllCargosWithinBounds(cargos, config),
    [cargos, config]
  );

  const outOfBoundsCargos = useMemo(
    () => getOutOfBoundsCargos(cargos, config),
    [cargos, config]
  );

  const configErrors = useMemo(() => {
    const errors = [...validateConfig(config), ...validateCargos(cargos)];
    if (!allCargosInBounds) {
      errors.push(`以下货物超出竹筏边界：${outOfBoundsCargos.join('、')}`);
    }
    return errors;
  }, [config, cargos, allCargosInBounds, outOfBoundsCargos]);

  const isValid = configErrors.length === 0;

  useEffect(() => {
    const weather = generateWeatherReport(config, baseStability);
    setWeatherReport(weather);
  }, [config, baseStability]);

  useEffect(() => {
    const report = generateSailingReport(config, cargos, buoyancy, stability, allCargosInBounds, weatherReport || undefined);
    setSailingReport(report);

    const suggestions = generateLoadingSuggestions(config, cargos, buoyancy, stability);
    setLoadingSuggestions(suggestions);
  }, [config, cargos, buoyancy, stability, allCargosInBounds, weatherReport]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!physicsRunning || !physicsEngineRef.current) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = lastTimeRef.current === 0 ? 0.016 : (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const clampedDelta = Math.min(deltaTime, 0.05);

    if (!playbackState.isPlaying) {
      physicsEngineRef.current.update(clampedDelta);
      const state = physicsEngineRef.current.getState();
      setPhysicsState(state);

      const updatedCargos = cargos.map((cargo) => {
        const cp = state.cargosPhysics.find((c) => c.cargoId === cargo.id);
        if (cp) {
          return { ...cargo, x: cp.x, y: cp.y };
        }
        return cargo;
      });
      setPhysicsCargos(updatedCargos);

      if (isRecording && playbackManager.getState().isRecording) {
        const raftBody = physicsEngineRef.current.getRaftBody();
        const frame: PlaybackFrame = {
          timestamp: Date.now() - recordingStartTimeRef.current,
          raft: {
            x: raftBody?.position.x ?? 0,
            y: raftBody?.position.y ?? 0,
            angle: raftBody?.angle ?? 0,
          },
          cargos: state.cargosPhysics.map((cp) => ({
            id: cp.cargoId,
            x: cp.x,
            y: cp.y,
            angle: cp.angle,
          })),
          waterLevel: state.waterLevel,
        };
        playbackManager.recordFrame(frame);
      }
    } else {
      const frame = playbackManager.updatePlayback(clampedDelta);
      if (frame) {
        setPlaybackFrame(frame);
        setPlaybackState(playbackManager.getState());

        const updatedCargos = cargos.map((cargo) => {
          const frameCargo = frame.cargos.find((c) => c.id === cargo.id);
          if (frameCargo) {
            return { ...cargo, x: frameCargo.x, y: frameCargo.y };
          }
          return cargo;
        });
        setPlaybackCargos(updatedCargos);
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [physicsRunning, isRecording, playbackState.isPlaying, cargos]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  const handleCargoMove = useCallback(
    (cargoId: string, x: number, y: number) => {
      if (physicsRunning || playbackState.isPlaying) return;
      setCargos((prev) =>
        prev.map((c) => {
          if (c.id === cargoId) {
            const clamped = clampCargoToBounds(x, y, c.width, c.height, config);
            return { ...c, x: clamped.x, y: clamped.y };
          }
          return c;
        })
      );
    },
    [config, physicsRunning, playbackState.isPlaying]
  );

  const handleLoadScheme = useCallback((scheme: SavedScheme) => {
    setConfig({ ...scheme.config });
    setCargos(scheme.cargos.map((c) => ({ ...c })));
    setSelectedCargoId(null);
    setPhysicsRunning(false);
    setIsRecording(false);
    playbackManager.stopPlayback();
    setPlaybackState(playbackManager.getState());
    setPlaybackCargos(null);
    setPlaybackFrame(null);
    physicsEngineRef.current?.stop();
    physicsEngineRef.current?.reset();
  }, []);

  const handleStartPhysics = useCallback(() => {
    if (playbackState.isPlaying) return;
    physicsEngineRef.current?.start();
    setPhysicsRunning(true);
    setPhysicsState(physicsEngineRef.current?.getState() ?? null);
    lastTimeRef.current = 0;
  }, [playbackState.isPlaying]);

  const handleStopPhysics = useCallback(() => {
    physicsEngineRef.current?.stop();
    setPhysicsRunning(false);
    setPhysicsState(null);
    setIsRecording(false);
    setPhysicsCargos(null);
    playbackManager.stopPlayback();
    setPlaybackState(playbackManager.getState());
    setPlaybackCargos(null);
    setPlaybackFrame(null);
    lastTimeRef.current = 0;
  }, []);

  const handlePausePhysics = useCallback(() => {
    physicsEngineRef.current?.pause();
    setPhysicsRunning(false);
  }, []);

  const handleResetPhysics = useCallback(() => {
    physicsEngineRef.current?.reset();
    setPhysicsState(null);
    lastTimeRef.current = 0;
  }, []);

  const handleStartRecording = useCallback(() => {
    playbackManager.startRecording();
    setIsRecording(true);
    recordingStartTimeRef.current = Date.now();
  }, []);

  const handleStopRecording = useCallback(() => {
    const result = playbackManager.stopRecording();
    setIsRecording(false);
    setPlaybackState(playbackManager.getState());

    if (result.frames.length > 0) {
      const recording = {
        id: result.id,
        name: `录制 ${new Date().toLocaleString('zh-CN')}`,
        createdAt: Date.now(),
        frames: result.frames,
        config: { ...config },
        cargos: cargos.map((c) => ({ ...c })),
      };
      storageManager.savePlayback(recording);
      setPlaybackRecordings(storageManager.loadPlaybacks());
    }
  }, [config, cargos]);

  const handleWaterFlowModeChange = useCallback((mode: WaterFlowMode) => {
    setConfig((prev) => ({ ...prev, waterFlowMode: mode }));
  }, []);

  const handleWaterFlowSpeedChange = useCallback((speed: number) => {
    setConfig((prev) => ({ ...prev, waterFlowSpeed: speed }));
  }, []);

  const handlePulseIntensityChange = useCallback((intensity: number) => {
    setConfig((prev) => ({ ...prev, pulseIntensity: intensity }));
  }, []);

  const handlePulseFrequencyChange = useCallback((frequency: number) => {
    setConfig((prev) => ({ ...prev, pulseFrequency: frequency }));
  }, []);

  const handleApplySuggestion = useCallback((suggestion: LoadingSuggestion) => {
    if (physicsRunning || playbackState.isPlaying) return;

    if (suggestion.type === 'balance' || suggestion.type === 'position') {
      if (suggestion.cargoId !== undefined && suggestion.toX !== undefined && suggestion.toY !== undefined) {
        setCargos((prev) =>
          prev.map((c) => {
            if (c.id === suggestion.cargoId) {
              const clamped = clampCargoToBounds(suggestion.toX!, suggestion.toY!, c.width, c.height, config);
              return { ...c, x: clamped.x, y: clamped.y };
            }
            return c;
          })
        );
      }
    } else if (suggestion.type === 'remove') {
      if (suggestion.cargoId) {
        setCargos((prev) => prev.filter((c) => c.id !== suggestion.cargoId));
        if (selectedCargoId === suggestion.cargoId) {
          setSelectedCargoId(null);
        }
      }
    } else if (suggestion.type === 'add') {
      setConfig((prev) => ({ ...prev, tubeCount: Math.min(20, prev.tubeCount + 2) }));
    }
  }, [config, physicsRunning, playbackState.isPlaying, selectedCargoId]);

  const handlePlayRecording = useCallback((recording: typeof playbackRecordings[0]) => {
    if (physicsRunning) {
      handleStopPhysics();
    }
    setConfig({ ...recording.config });
    setCargos(recording.cargos.map((c) => ({ ...c })));
    playbackManager.startPlayback(recording.frames, 1);
    setPlaybackState(playbackManager.getState());
    setPlaybackCargos(null);
    setPlaybackFrame(null);
  }, [physicsRunning, handleStopPhysics]);

  const handleDeleteRecording = useCallback((id: string) => {
    storageManager.deletePlayback(id);
    setPlaybackRecordings(storageManager.loadPlaybacks());
  }, []);

  const handleRenameRecording = useCallback((id: string, newName: string) => {
    const recordings = storageManager.loadPlaybacks();
    const updated = recordings.map((r) => (r.id === id ? { ...r, name: newName } : r));
    updated.forEach((r) => storageManager.savePlayback(r));
    setPlaybackRecordings(storageManager.loadPlaybacks());
  }, []);

  const handleSeek = useCallback((progress: number) => {
    const frame = playbackManager.seekToFrame(Math.floor(progress * playbackState.frames.length / 100));
    if (frame) {
      setPlaybackFrame(frame);
      const updatedCargos = cargos.map((cargo) => {
        const frameCargo = frame.cargos.find((c) => c.id === cargo.id);
        if (frameCargo) {
          return { ...cargo, x: frameCargo.x, y: frameCargo.y };
        }
        return cargo;
      });
      setPlaybackCargos(updatedCargos);
    }
  }, [playbackState.frames.length, cargos]);

  const handleSpeedChange = useCallback((speed: number) => {
    playbackManager.setPlaybackSpeed(speed);
    setPlaybackState(playbackManager.getState());
  }, []);

  const handlePlayPause = useCallback(() => {
    if (playbackState.isPlaying) {
      playbackManager.pausePlayback();
    } else {
      playbackManager.resumePlayback();
    }
    setPlaybackState(playbackManager.getState());
  }, [playbackState.isPlaying]);

  const handleStopPlayback = useCallback(() => {
    playbackManager.stopPlayback();
    setPlaybackState(playbackManager.getState());
    setPlaybackCargos(null);
    setPlaybackFrame(null);
  }, []);

  const handleWeatherWaterChange = useCallback((weatherWater: WeatherWaterConfig) => {
    setConfig((prev) => ({ ...prev, weatherWater }));
  }, []);

  const displayCargos = playbackCargos ?? physicsCargos ?? cargos;
  const displayRaftAngle = playbackFrame?.raft.angle ?? physicsState?.raftAngle ?? 0;
  const displayWaterLevel = playbackFrame?.waterLevel ?? physicsState?.waterLevel ?? 0;
  const displayDraftDepth = physicsState?.dynamicDraftDepth ?? buoyancy.draftDepth;

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      style={{ backgroundColor: '#f8f9fa' }}
    >
      <AppShell.Header style={{ backgroundColor: '#2c3e50', color: 'white' }}>
        <Container fluid h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="md" wrap="nowrap">
              <IconShip size={32} />
              <div>
                <Title order={4} c="white">
                  竹筏载重与浮力模拟器 2.0
                </Title>
                <Text size="xs" c="dimmed">
                  Bamboo Raft Load & Buoyancy Simulator v2.0
                </Text>
              </div>
            </Group>
            <Group gap="md" wrap="nowrap">
              <Badge
                size="lg"
                color={stability.isSailable ? 'green' : 'red'}
                variant="filled"
                radius="sm"
              >
                {stability.isSailable ? '✓ 可出航' : '✗ 不可出航'}
              </Badge>
              <Badge size="lg" color="blue" variant="light" radius="sm">
                货物: {cargos.length} 件
              </Badge>
              {physicsRunning && (
                <Badge
                  size="lg"
                  color="green"
                  variant="light"
                  radius="sm"
                  style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                >
                  ⚡ 仿真运行中
                </Badge>
              )}
              {isRecording && (
                <Badge
                  size="lg"
                  color="red"
                  variant="filled"
                  radius="sm"
                  style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                >
                  ● 录制中
                </Badge>
              )}
              {playbackState.isPlaying && (
                <Badge size="lg" color="violet" variant="light" radius="sm">
                  ▶ 回放中
                </Badge>
              )}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container fluid>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'simulation')} mb="md">
            <Tabs.List>
              <Tabs.Tab value="simulation">仿真模式</Tabs.Tab>
              <Tabs.Tab value="analysis">分析报告</Tabs.Tab>
              <Tabs.Tab value="playback">方案回放</Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {activeTab === 'simulation' && (
            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: 3 }} order={{ base: 3, md: 1 }}>
                <Stack gap="md">
                  <PhysicsControlPanel
                    isRunning={physicsRunning}
                    onStart={handleStartPhysics}
                    onStop={handleStopPhysics}
                    onPause={handlePausePhysics}
                    onReset={handleResetPhysics}
                    onRecord={handleStartRecording}
                    onStopRecord={handleStopRecording}
                    isRecording={isRecording}
                    waterFlowMode={config.waterFlowMode}
                    onWaterFlowModeChange={handleWaterFlowModeChange}
                    waterFlowSpeed={config.waterFlowSpeed}
                    onWaterFlowSpeedChange={handleWaterFlowSpeedChange}
                    pulseIntensity={config.pulseIntensity}
                    onPulseIntensityChange={handlePulseIntensityChange}
                    pulseFrequency={config.pulseFrequency}
                    onPulseFrequencyChange={handlePulseFrequencyChange}
                  />
                  <ControlPanel
                    config={config}
                    onConfigChange={setConfig}
                    cargos={cargos}
                    onCargosChange={setCargos}
                    selectedCargoId={selectedCargoId}
                    onSelectedCargoChange={setSelectedCargoId}
                  />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
                <Stack gap="md">
                  <Box
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'auto',
                      width: '100%',
                    }}
                  >
                    <RaftTopView
                      config={config}
                      cargos={displayCargos}
                      cogX={stability.cogX}
                      cogY={stability.cogY}
                      onCargoMove={handleCargoMove}
                      onCargoSelect={setSelectedCargoId}
                      selectedCargoId={selectedCargoId}
                      raftAngle={displayRaftAngle}
                      physicsState={physicsState}
                      physicsRunning={physicsRunning || playbackState.isPlaying}
                    />
                  </Box>

                  <Divider label="侧视图" labelPosition="center" />

                  <Box
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'auto',
                      width: '100%',
                    }}
                  >
                    <RaftSideView
                      config={config}
                      cargos={displayCargos}
                      draftDepth={displayDraftDepth}
                      raftAngle={displayRaftAngle}
                      waterLevel={displayWaterLevel}
                      physicsRunning={physicsRunning || playbackState.isPlaying}
                    />
                  </Box>

                  <ChartsPanel
                    buoyancy={buoyancy}
                    stability={stability}
                    cargos={cargos}
                    config={config}
                  />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 3 }} order={{ base: 2, md: 3 }}>
                <Stack gap="md">
                  <DataPanel
                    buoyancy={buoyancy}
                    stability={stability}
                    configErrors={configErrors}
                  />
                  <LoadingSuggestionPanel
                    suggestions={loadingSuggestions}
                    onApplySuggestion={handleApplySuggestion}
                  />
                  <SchemeManager
                    schemes={savedSchemes}
                    onSchemesChange={(schemes) => {
                      setSavedSchemes(schemes);
                      storageManager.saveSchemes(schemes);
                    }}
                    currentConfig={config}
                    currentCargos={cargos}
                    currentBuoyancy={buoyancy}
                    currentStability={stability}
                    currentWeatherReport={weatherReport!}
                    onLoadScheme={handleLoadScheme}
                    isValid={isValid && stability.isSailable}
                  />
                </Stack>
              </Grid.Col>
            </Grid>
          )}

          {activeTab === 'analysis' && (
            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <WeatherWarningPanel
                  config={config.weatherWater}
                  onConfigChange={handleWeatherWaterChange}
                  weatherReport={weatherReport}
                  onRefresh={() => {
                    const weather = generateWeatherReport(config, baseStability);
                    setWeatherReport(weather);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <SailingReportPanel
                  report={sailingReport}
                  onRefresh={() => {
                    const report = generateSailingReport(config, cargos, buoyancy, stability, allCargosInBounds, weatherReport || undefined);
                    setSailingReport(report);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack gap="md">
                  <LoadingSuggestionPanel
                    suggestions={loadingSuggestions}
                    onApplySuggestion={handleApplySuggestion}
                  />
                  <ChartsPanel
                    buoyancy={buoyancy}
                    stability={stability}
                    cargos={cargos}
                    config={config}
                  />
                </Stack>
              </Grid.Col>
            </Grid>
          )}

          {activeTab === 'playback' && (
            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack gap="md">
                  <Box
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'auto',
                      width: '100%',
                    }}
                  >
                    <RaftTopView
                      config={config}
                      cargos={displayCargos}
                      cogX={stability.cogX}
                      cogY={stability.cogY}
                      onCargoMove={handleCargoMove}
                      onCargoSelect={setSelectedCargoId}
                      selectedCargoId={selectedCargoId}
                      raftAngle={displayRaftAngle}
                      physicsState={playbackFrame ? { ...physicsState!, waterLevel: displayWaterLevel, raftAngle: displayRaftAngle } : physicsState}
                      physicsRunning={playbackState.isPlaying}
                    />
                  </Box>
                  <Box
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'auto',
                      width: '100%',
                    }}
                  >
                    <RaftSideView
                      config={config}
                      cargos={displayCargos}
                      draftDepth={displayDraftDepth}
                      raftAngle={displayRaftAngle}
                      waterLevel={displayWaterLevel}
                      physicsRunning={playbackState.isPlaying}
                    />
                  </Box>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <PlaybackPanel
                  playbackState={playbackState}
                  recordings={playbackRecordings}
                  onPlayRecording={handlePlayRecording}
                  onDeleteRecording={handleDeleteRecording}
                  onRenameRecording={handleRenameRecording}
                  onSeek={handleSeek}
                  onSpeedChange={handleSpeedChange}
                  onPlayPause={handlePlayPause}
                  onStop={handleStopPlayback}
                />
              </Grid.Col>
            </Grid>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
