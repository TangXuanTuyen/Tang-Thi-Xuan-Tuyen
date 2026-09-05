/**
 * Real-time 3-Zone Motion and Presence Analyzer for Classrooms
 * Analyzes video feed locally in memory via Canvas.
 * No images or video frames are saved or transmitted.
 */

export interface ZoneDetectionResult {
  1: { present: boolean; motionLevel: number; confidence: number };
  2: { present: boolean; motionLevel: number; confidence: number };
  3: { present: boolean; motionLevel: number; confidence: number };
}

export class CameraMotionDetector {
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private animationFrameId: number | null = null;
  private sensitivity: number = 5; // 1 to 10
  private isFlipped: boolean = true; // Mirrors camera feed like selfie view
  private lastVideoTime: number = -1;
  private smoothedMotion: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
  private onDetectionCallback: ((result: ZoneDetectionResult) => void) | null = null;
  private isAnalyzing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvasEl = document.createElement('canvas');
      this.canvasEl.width = 160; // downsampled for fast 60fps processing
      this.canvasEl.height = 90;
      this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
    }
  }

  public setVideoElement(video: HTMLVideoElement | null) {
    this.videoEl = video;
  }

  public setSensitivity(val: number) {
    this.sensitivity = Math.max(1, Math.min(10, val));
  }

  public setIsFlipped(flipped: boolean) {
    this.isFlipped = flipped;
  }

  public onDetection(cb: (result: ZoneDetectionResult) => void) {
    this.onDetectionCallback = cb;
  }

  public start() {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.prevFrameData = null;
    this.lastVideoTime = -1;
    this.processLoop();
  }

  public stop() {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.prevFrameData = null;
    this.lastVideoTime = -1;
  }

  private processLoop = () => {
    if (!this.isAnalyzing) return;

    if (this.videoEl && this.ctx && this.videoEl.readyState >= 2 && !this.videoEl.paused && !this.videoEl.ended) {
      // Avoid processing duplicate frames from webcam (prevents false 0-motion spikes)
      if (this.videoEl.currentTime > 0 && this.videoEl.currentTime === this.lastVideoTime && this.prevFrameData) {
        this.animationFrameId = requestAnimationFrame(this.processLoop);
        return;
      }
      this.lastVideoTime = this.videoEl.currentTime;

      const width = this.canvasEl!.width;
      const height = this.canvasEl!.height;

      try {
        this.ctx.drawImage(this.videoEl, 0, 0, width, height);
        const currentFrame = this.ctx.getImageData(0, 0, width, height);
        const currData = currentFrame.data;

        if (this.prevFrameData) {
          const zoneWidth = Math.floor(width / 3);
          const zoneChangedPixels = [0, 0, 0];
          const zoneDiffSum = [0, 0, 0];
          const zonePixelCounts = [0, 0, 0];
          const zoneLuminanceVariance = [0, 0, 0];

          // Threshold based on sensitivity (1 to 10)
          // Sensitivity 5 gives ~15 threshold, sensitive to movement while ignoring sensor noise
          const diffThreshold = Math.max(7, 22 - this.sensitivity * 1.4);

          for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x += 2) {
              const idx = (y * width + x) * 4;
              const rawZoneIdx = Math.min(2, Math.floor(x / zoneWidth));

              const rDiff = Math.abs(currData[idx] - this.prevFrameData[idx]);
              const gDiff = Math.abs(currData[idx + 1] - this.prevFrameData[idx + 1]);
              const bDiff = Math.abs(currData[idx + 2] - this.prevFrameData[idx + 2]);
              const avgDiff = (rDiff + gDiff + bDiff) / 3;

              // Check if pixel changed significantly
              if (avgDiff > diffThreshold) {
                zoneChangedPixels[rawZoneIdx]++;
                zoneDiffSum[rawZoneIdx] += avgDiff;
              }
              zonePixelCounts[rawZoneIdx]++;

              // Luminance for presence check
              const lum = 0.299 * currData[idx] + 0.587 * currData[idx + 1] + 0.114 * currData[idx + 2];
              zoneLuminanceVariance[rawZoneIdx] += Math.abs(lum - 128);
            }
          }

          // Build result with correct flipped-zone mapping:
          // In mirrored video, screen left (Slot 1) corresponds to camera right (rawZone 2)
          const result: ZoneDetectionResult = {
            1: { present: true, motionLevel: 0, confidence: 90 },
            2: { present: true, motionLevel: 0, confidence: 90 },
            3: { present: true, motionLevel: 0, confidence: 90 },
          };

          for (let rawZone = 0; rawZone < 3; rawZone++) {
            const count = zonePixelCounts[rawZone] || 1;
            const changedRatio = (zoneChangedPixels[rawZone] / count) * 100; // 0% to 100%
            const avgDiffMagnitude = zoneChangedPixels[rawZone] > 0
              ? (zoneDiffSum[rawZone] / zoneChangedPixels[rawZone])
              : 0;

            // Combine pixel change percentage and intensity
            let rawMotion = (changedRatio * 2.2) + (avgDiffMagnitude * 0.4);
            // Suppress minor background noise grain if very few pixels changed
            if (changedRatio < 1.6) {
              rawMotion = rawMotion * 0.35;
            }
            const normalizedMotion = Math.min(100, Math.max(0, Math.round(rawMotion)));

            const lumScore = zoneLuminanceVariance[rawZone] / count;
            const isPresent = lumScore > 8 || normalizedMotion > 4;
            const confidence = Math.min(99, Math.max(50, Math.round(50 + normalizedMotion * 0.4 + lumScore * 0.3)));

            // Map raw zone index to screen slot key based on horizontal flip
            const slotKey = (this.isFlipped ? (3 - rawZone) : (rawZone + 1)) as 1 | 2 | 3;

            // Smooth motion with Exponential Moving Average (70% current, 30% previous)
            const prev = this.smoothedMotion[slotKey] ?? normalizedMotion;
            const smoothed = Math.round(prev * 0.3 + normalizedMotion * 0.7);
            this.smoothedMotion[slotKey] = smoothed;

            result[slotKey] = {
              present: isPresent,
              motionLevel: smoothed,
              confidence: confidence,
            };
          }

          if (this.onDetectionCallback) {
            this.onDetectionCallback(result);
          }
        }

        // Store copy of current frame for next comparison
        if (!this.prevFrameData || this.prevFrameData.length !== currData.length) {
          this.prevFrameData = new Uint8ClampedArray(currData.length);
        }
        this.prevFrameData.set(currData);
      } catch {
        // Ignore cross-origin frame capture errors if any
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };
}
