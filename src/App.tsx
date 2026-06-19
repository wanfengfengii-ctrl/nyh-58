import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AppShell,
  Title,
  Container,
  Grid,
  Group,
  Text,
  Badge,
} from '@mantine/core';
import { IconShip } from '@tabler/icons-react';
import type { RaftConfig, Cargo, SavedScheme } from './types';
import { DEFAULT_CONFIG, DEFAULT_CARGOS } from './constants';
import { calculateBuoyancy, calculateStability, validateConfig, validateCargos } from './utils/physics';
import { clampCargoToBounds, clampAllCargosToBounds, areAllCargosWithinBounds, getOutOfBoundsCargos } from './utils/raftGeometry';
import { RaftTopView } from './components/RaftTopView';
import { ControlPanel } from './components/ControlPanel';
import { DataPanel } from './components/DataPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { SchemeManager } from './components/SchemeManager';

function App() {
  const [config, setConfig] = useState<RaftConfig>(DEFAULT_CONFIG);
  const [cargos, setCargos] = useState<Cargo[]>(DEFAULT_CARGOS);
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null);
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);

  useEffect(() => {
    setCargos((prev) => clampAllCargosToBounds(prev, config));
  }, [config.tubeCount, config.tubeDiameter, config.tubeLength, config.tubeSpacing]);

  const buoyancy = useMemo(
    () => calculateBuoyancy(config, cargos),
    [config, cargos]
  );

  const stability = useMemo(
    () => {
      const baseStability = calculateStability(config, cargos, buoyancy);
      const allInBounds = areAllCargosWithinBounds(cargos, config);
      return {
        ...baseStability,
        isSailable: baseStability.isSailable && allInBounds,
      };
    },
    [config, cargos, buoyancy]
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

  const handleCargoMove = useCallback(
    (cargoId: string, x: number, y: number) => {
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
    [config]
  );

  const handleLoadScheme = useCallback((scheme: SavedScheme) => {
    setConfig({ ...scheme.config });
    setCargos(scheme.cargos.map((c) => ({ ...c })));
    setSelectedCargoId(null);
  }, []);

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      style={{ backgroundColor: '#f8f9fa' }}
    >
      <AppShell.Header style={{ backgroundColor: '#2c3e50', color: 'white' }}>
        <Container fluid h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="md">
              <IconShip size={32} />
              <div>
                <Title order={4} c="white">
                  竹筏载重与浮力模拟器
                </Title>
                <Text size="xs" c="dimmed">
                  Bamboo Raft Load & Buoyancy Simulator
                </Text>
              </div>
            </Group>
            <Group gap="md">
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
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container fluid>
          <Grid gap="md">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <ControlPanel
                config={config}
                onConfigChange={setConfig}
                cargos={cargos}
                onCargosChange={setCargos}
                selectedCargoId={selectedCargoId}
                onSelectedCargoChange={setSelectedCargoId}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Grid gap="md">
                <Grid.Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'auto',
                    }}
                  >
                    <RaftTopView
                      config={config}
                      cargos={cargos}
                      cogX={stability.cogX}
                      cogY={stability.cogY}
                      onCargoMove={handleCargoMove}
                      onCargoSelect={setSelectedCargoId}
                      selectedCargoId={selectedCargoId}
                    />
                  </div>
                </Grid.Col>
                <Grid.Col span={12}>
                  <ChartsPanel
                    buoyancy={buoyancy}
                    stability={stability}
                    cargos={cargos}
                    config={config}
                  />
                </Grid.Col>
              </Grid>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3 }}>
              <DataPanel
                buoyancy={buoyancy}
                stability={stability}
                configErrors={configErrors}
              />
              <SchemeManager
                schemes={savedSchemes}
                onSchemesChange={setSavedSchemes}
                currentConfig={config}
                currentCargos={cargos}
                currentBuoyancy={buoyancy}
                currentStability={stability}
                onLoadScheme={handleLoadScheme}
                isValid={isValid && stability.isSailable}
              />
            </Grid.Col>
          </Grid>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
