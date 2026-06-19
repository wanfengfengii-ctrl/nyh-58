import { STORAGE_KEYS } from '../constants';
import type {
  SavedScheme,
  PlaybackFrame,
  RaftConfig,
  Cargo,
  LocalStorageData,
} from '../types';

const DEFAULT_SETTINGS: LocalStorageData['settings'] = {
  waterFlowMode: 'steady',
  showWaterLine: true,
  showCenterOfGravity: true,
  autoSave: true,
};

class StorageManager {
  private memoryStorage: Partial<LocalStorageData> = {};
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  private get<T>(key: string, defaultValue: T): T {
    if (this.isLocalStorageAvailable) {
      try {
        const value = localStorage.getItem(key);
        if (value === null) {
          return defaultValue;
        }
        return JSON.parse(value) as T;
      } catch (e) {
        return defaultValue;
      }
    } else {
      const keyMapping: Record<string, keyof LocalStorageData> = {
        [STORAGE_KEYS.SAVED_SCHEMES]: 'savedSchemes',
        [STORAGE_KEYS.PLAYBACKS]: 'playbackRecordings',
        [STORAGE_KEYS.SETTINGS]: 'settings',
      };
      const dataKey = keyMapping[key];
      if (dataKey && this.memoryStorage[dataKey] !== undefined) {
        return this.memoryStorage[dataKey] as T;
      }
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // Ignore write errors
      }
    } else {
      const keyMapping: Record<string, keyof LocalStorageData> = {
        [STORAGE_KEYS.SAVED_SCHEMES]: 'savedSchemes',
        [STORAGE_KEYS.PLAYBACKS]: 'playbackRecordings',
        [STORAGE_KEYS.SETTINGS]: 'settings',
      };
      const dataKey = keyMapping[key];
      if (dataKey) {
        (this.memoryStorage as Record<string, unknown>)[dataKey] = value;
      }
    }
  }

  private remove(key: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore remove errors
      }
    } else {
      const keyMapping: Record<string, keyof LocalStorageData> = {
        [STORAGE_KEYS.SAVED_SCHEMES]: 'savedSchemes',
        [STORAGE_KEYS.PLAYBACKS]: 'playbackRecordings',
        [STORAGE_KEYS.SETTINGS]: 'settings',
      };
      const dataKey = keyMapping[key];
      if (dataKey) {
        delete this.memoryStorage[dataKey];
      }
    }
  }

  saveSchemes(schemes: SavedScheme[]): void {
    this.set(STORAGE_KEYS.SAVED_SCHEMES, schemes);
  }

  loadSchemes(): SavedScheme[] {
    return this.get<SavedScheme[]>(STORAGE_KEYS.SAVED_SCHEMES, []);
  }

  savePlayback(playback: {
    id: string;
    name: string;
    createdAt: number;
    frames: PlaybackFrame[];
    config: RaftConfig;
    cargos: Cargo[];
  }): void {
    const playbacks = this.loadPlaybacks();
    const existingIndex = playbacks.findIndex((p) => p.id === playback.id);
    if (existingIndex >= 0) {
      playbacks[existingIndex] = playback;
    } else {
      playbacks.push(playback);
    }
    this.set(STORAGE_KEYS.PLAYBACKS, playbacks);
  }

  loadPlaybacks(): Array<{
    id: string;
    name: string;
    createdAt: number;
    frames: PlaybackFrame[];
    config: RaftConfig;
    cargos: Cargo[];
  }> {
    return this.get<
      Array<{
        id: string;
        name: string;
        createdAt: number;
        frames: PlaybackFrame[];
        config: RaftConfig;
        cargos: Cargo[];
      }>
    >(STORAGE_KEYS.PLAYBACKS, []);
  }

  deletePlayback(id: string): void {
    const playbacks = this.loadPlaybacks();
    const filtered = playbacks.filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.PLAYBACKS, filtered);
  }

  saveSettings(settings: LocalStorageData['settings']): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  loadSettings(): LocalStorageData['settings'] {
    return this.get<LocalStorageData['settings']>(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS
    );
  }

  clearAll(): void {
    this.remove(STORAGE_KEYS.SAVED_SCHEMES);
    this.remove(STORAGE_KEYS.PLAYBACKS);
    this.remove(STORAGE_KEYS.SETTINGS);
  }

  getData(): LocalStorageData {
    return {
      savedSchemes: this.loadSchemes(),
      playbackRecordings: this.loadPlaybacks(),
      settings: this.loadSettings(),
    };
  }
}

export { StorageManager };
