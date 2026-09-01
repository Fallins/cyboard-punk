export type OperatorQualityLevel = 'high' | 'balanced' | 'low';

export interface OperatorQualityProfile {
  level: OperatorQualityLevel;
  pixelRatioCap: number;
  targetFrameMs: number;
}

const profiles: Record<OperatorQualityLevel, OperatorQualityProfile> = {
  high: { level: 'high', pixelRatioCap: 1.5, targetFrameMs: 1000 / 30 },
  balanced: { level: 'balanced', pixelRatioCap: 1, targetFrameMs: 1000 / 30 },
  low: { level: 'low', pixelRatioCap: 1, targetFrameMs: 1000 / 20 },
};

const SAMPLE_WINDOW = 60;

export class OperatorPerformanceGovernor {
  private level: OperatorQualityLevel = 'high';
  private samples: number[] = [];
  private latestAverageRenderMs = 0;

  profile(): OperatorQualityProfile {
    return profiles[this.level];
  }

  averageRenderMs(): number {
    return this.latestAverageRenderMs;
  }

  recordRender(renderMs: number): boolean {
    if (!Number.isFinite(renderMs) || renderMs < 0) return false;
    this.samples.push(Math.min(renderMs, 250));
    if (this.samples.length < SAMPLE_WINDOW) return false;

    const average = this.samples.reduce((sum, sample) => sum + sample, 0) / this.samples.length;
    this.latestAverageRenderMs = average;
    this.samples = [];

    const previous = this.level;
    switch (this.level) {
      case 'high':
        if (average > 12) this.level = 'balanced';
        break;
      case 'balanced':
        if (average > 20) this.level = 'low';
        else if (average < 7) this.level = 'high';
        break;
      case 'low':
        if (average < 10) this.level = 'balanced';
        break;
    }
    return previous !== this.level;
  }
}
