/**
 * Real-time 3-Zone Motion and Presence Analyzer for Classrooms
 * Analyzes video feed locally in memory via Canvas frame differencing.
 * No images or video frames are saved or transmitted outside the browser.
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
  private smoothedMotion: { [key: number]: number } = { 1: 0, 2: 0, 3: 0 };
  private onDetectionCallback: ((result: ZoneDetectionResult) => void) | null = null;
  private isAnalyzing: boolean = false;
  private lastProcessTime: number = 0;
  private readonly targetIntervalMs: number = 50; // ~20 fps for optimal human motion delta

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvasEl = document.createElement('canvas');
      this.canvasEl.width = 160; // downsampled for fast, lightweight processing
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
    this.lastProcessTime = 0;
    this.processLoop();
  }

  public stop() {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.prevFrameData = null;
    this.lastProcessTime = 0;
  }

  private processLoop = () => {
    if (!this.isAnalyzing) return;

    const now = performance.now();
    const timeSinceLast = now - this.lastProcessTime;

    // Check if video is loaded, playing, and has valid dimensions
    if (
      this.videoEl &&
      this.ctx &&
      this.canvasEl &&
      this.videoEl.readyState >= 2 &&
      this.videoEl.videoWidth > 0 &&
      this.videoEl.videoHeight > 0 &&
      !this.videoEl.paused &&
      !this.videoEl.ended
    ) {
      // Process at ~20fps (every ~50ms) to allow real physical movement between frames
      if (timeSinceLast >= this.targetIntervalMs) {
        this.lastProcessTime = now;

        const width = this.canvasEl.width;
        const height = this.canvasEl.height;

        try {
          this.ctx.drawImage(this.videoEl, 0, 0, width, height);
          const currentFrame = this.ctx.getImageData(0, 0, width, height);
          const currData = currentFrame.data;

          if (this.prevFrameData && this.prevFrameData.length === currData.length) {
            const zoneWidth = Math.floor(width / 3);
            const zoneChangedPixels = [0, 0, 0];
            const zoneDiffSum = [0, 0, 0];
            const zonePixelCounts = [0, 0, 0];
            const zoneLuminanceVariance = [0, 0, 0];

            // Sensitivity 1 (least sensitive, threshold 16) to 10 (most sensitive, threshold 5)
            // Default 5 gives diffThreshold = 10.5
            const diffThreshold = Math.max(5, 17 - this.sensitivity * 1.2);

            // Step through pixels (sampling every 2nd pixel in x & y for high speed & low CPU)
            for (let y = 0; y < height; y += 2) {
              for (let x = 0; x < width; x += 2) {
                const idx = (y * width + x) * 4;
                const rawZoneIdx = Math.min(2, Math.floor(x / zoneWidth));

                const rDiff = Math.abs(currData[idx] - this.prevFrameData[idx]);
                const gDiff = Math.abs(currData[idx + 1] - this.prevFrameData[idx + 1]);
                const bDiff = Math.abs(currData[idx + 2] - this.prevFrameData[idx + 2]);
                const avgDiff = (rDiff + gDiff + bDiff) / 3;

                if (avgDiff > diffThreshold) {
                  zoneChangedPixels[rawZoneIdx]++;
                  zoneDiffSum[rawZoneIdx] += avgDiff;
                }
                zonePixelCounts[rawZoneIdx]++;

                // Calculate luminance variance to verify human presence in zone
                const lum = 0.299 * currData[idx] + 0.587 * currData[idx + 1] + 0.114 * currData[idx + 2];
                zoneLuminanceVariance[rawZoneIdx] += Math.abs(lum - 128);
              }
            }

            // Build result for the 3 classroom zones
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

              // Sensor noise floor threshold (ambient camera noise)
              const noiseFloor = Math.max(0.2, 0.6 - this.sensitivity * 0.04);
              let rawMotion = 0;

              if (changedRatio > noiseFloor) {
                // Actual physical motion detected
                const effectiveRatio = changedRatio - noiseFloor;
                // Scale motion so that:
                // - Small head/hand twitch (~1% changed pixels) -> ~15-25%
                // - Active arm waving (~3-5% changed pixels) -> ~45-65%
                // - Jumping / full body dancing (~8%+ changed pixels) -> ~80-100%
                rawMotion = (effectiveRatio * 8.8) + (avgDiffMagnitude * 0.4);
              }

              const normalizedMotion = Math.min(100, Math.max(0, Math.round(rawMotion)));

              const lumScore = zoneLuminanceVariance[rawZone] / count;
              const isPresent = lumScore > 6 || normalizedMotion > 3;
              const confidence = Math.min(99, Math.max(50, Math.round(50 + normalizedMotion * 0.4 + lumScore * 0.3)));

              // Map raw zone index to screen slot key based on horizontal flip
              const slotKey = (this.isFlipped ? (3 - rawZone) : (rawZone + 1)) as 1 | 2 | 3;

              // Fast attack (immediate reaction to movement), smooth release (prevents flickering)
              const prev = this.smoothedMotion[slotKey] ?? normalizedMotion;
              let smoothed = normalizedMotion;
              if (normalizedMotion > prev) {
                smoothed = Math.round(prev * 0.2 + normalizedMotion * 0.8);
              } else {
                smoothed = Math.round(prev * 0.65 + normalizedMotion * 0.35);
              }

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

          // Store current frame as previous reference
          if (!this.prevFrameData || this.prevFrameData.length !== currData.length) {
            this.prevFrameData = new Uint8ClampedArray(currData.length);
          }
          this.prevFrameData.set(currData);
        } catch {
          // Ignore transient draw/decode errors
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };
}
