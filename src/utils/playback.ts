import type { PlaybackFrame, PlaybackState } from '../types';

export class PlaybackManager {
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private frames: PlaybackFrame[] = [];
  private currentFrameIndex: number = -1;
  private playbackSpeed: number = 1;
  private startTime: number = 0;
  private totalDuration: number = 0;
  private accumulatedTime: number = 0;

  startRecording(): void {
    this.isRecording = true;
    this.frames = [];
    this.startTime = Date.now();
    this.totalDuration = 0;
  }

  stopRecording(): { id: string; frames: PlaybackFrame[]; duration: number } {
    this.isRecording = false;
    if (this.frames.length > 0) {
      const firstFrame = this.frames[0];
      const lastFrame = this.frames[this.frames.length - 1];
      this.totalDuration = lastFrame.timestamp - firstFrame.timestamp;
    }
    return {
      id: `recording-${Date.now()}`,
      frames: [...this.frames],
      duration: this.totalDuration,
    };
  }

  recordFrame(frame: PlaybackFrame): void {
    if (!this.isRecording) {
      return;
    }
    this.frames.push({ ...frame });
  }

  startPlayback(frames: PlaybackFrame[], speed?: number): void {
    if (frames.length === 0) {
      return;
    }
    this.frames = [...frames];
    this.currentFrameIndex = 0;
    this.accumulatedTime = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = Date.now();
    if (speed !== undefined) {
      this.playbackSpeed = speed;
    }
    const firstFrame = this.frames[0];
    const lastFrame = this.frames[this.frames.length - 1];
    this.totalDuration = lastFrame.timestamp - firstFrame.timestamp;
  }

  stopPlayback(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentFrameIndex = -1;
    this.accumulatedTime = 0;
  }

  pausePlayback(): void {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
    }
  }

  resumePlayback(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.startTime = Date.now();
    }
  }

  seekToFrame(index: number): PlaybackFrame | null {
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    this.currentFrameIndex = index;
    if (this.frames.length > 1) {
      const firstFrame = this.frames[0];
      const targetFrame = this.frames[index];
      this.accumulatedTime = targetFrame.timestamp - firstFrame.timestamp;
    }
    return this.frames[index];
  }

  getCurrentFrame(): PlaybackFrame | null {
    if (this.currentFrameIndex < 0 || this.currentFrameIndex >= this.frames.length) {
      return null;
    }
    return this.frames[this.currentFrameIndex];
  }

  getPlaybackProgress(): number {
    if (this.totalDuration <= 0 || this.frames.length <= 1) {
      return 0;
    }
    return Math.min(1, Math.max(0, this.accumulatedTime / this.totalDuration));
  }

  updatePlayback(deltaTime: number): PlaybackFrame | null {
    if (!this.isPlaying || this.isPaused || this.frames.length === 0) {
      return this.getCurrentFrame();
    }
    this.accumulatedTime += deltaTime * this.playbackSpeed;
    if (this.frames.length === 1) {
      this.currentFrameIndex = 0;
      return this.frames[0];
    }
    const firstFrame = this.frames[0];
    const targetTimestamp = firstFrame.timestamp + this.accumulatedTime;
    let left = 0;
    let right = this.frames.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.frames[mid].timestamp === targetTimestamp) {
        this.currentFrameIndex = mid;
        return this.frames[mid];
      } else if (this.frames[mid].timestamp < targetTimestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    if (right < 0) {
      this.currentFrameIndex = 0;
    } else if (left >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
      this.isPlaying = false;
    } else {
      this.currentFrameIndex = right;
    }
    return this.frames[this.currentFrameIndex];
  }

  getState(): PlaybackState {
    return {
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
      frames: [...this.frames],
      currentFrameIndex: this.currentFrameIndex,
      startTime: this.startTime,
      totalDuration: this.totalDuration,
      playbackSpeed: this.playbackSpeed,
    };
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, speed);
  }
}
