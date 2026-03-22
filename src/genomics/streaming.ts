/**
 * Genomics Bounded Context — BiomarkerStreamProcessor
 *
 * Wraps @ruvector/rvdna's StreamProcessor for real-time biomarker
 * anomaly detection with configurable z-score and CUSUM thresholds.
 */

import {
  StreamProcessor,
  defaultStreamConfig,
  BIOMARKER_DEFS,
} from '@ruvector/rvdna';
import type {
  StreamConfig,
  StreamStats,
  StreamSummary,
  ProcessingResult,
  BiomarkerReading,
} from '@ruvector/rvdna';

// ── Public interfaces ────────────────────────────────────────────

export interface ReadingResult {
  isAnomaly: boolean;
  zScore: number;
  trend: number;
}

export interface BiomarkerStreamConfig {
  /** z-score threshold for anomaly detection (default 2.5) */
  zScoreThreshold?: number;
  /** CUSUM threshold for changepoint detection (default 4.0) */
  cusumThreshold?: number;
  /** Rolling window size (default 100) */
  windowSize?: number;
}

// ── BiomarkerStreamProcessor ─────────────────────────────────────

export class BiomarkerStreamProcessor {
  private processor: InstanceType<typeof StreamProcessor>;
  private zScoreThreshold: number;
  private timestampCounter = 0;

  constructor(config?: BiomarkerStreamConfig) {
    const baseConfig = defaultStreamConfig();
    const streamConfig: StreamConfig = {
      ...baseConfig,
      windowSize: config?.windowSize ?? 100,
    };
    this.processor = new StreamProcessor(streamConfig);
    this.zScoreThreshold = config?.zScoreThreshold ?? 2.5;
  }

  /**
   * Process a single biomarker reading.
   *
   * @param biomarkerId - Identifier for the biomarker stream
   * @param value       - The observed numeric value
   * @returns Anomaly status, z-score, and current trend slope
   */
  processReading(biomarkerId: string, value: number): ReadingResult {
    // Find reference range for this biomarker
    const def = BIOMARKER_DEFS.find((d: { id: string }) => d.id === biomarkerId);
    const referenceLow = def ? def.low : 0;
    const referenceHigh = def ? def.high : 100;

    const reading: BiomarkerReading = {
      timestampMs: Date.now() + this.timestampCounter++,
      biomarkerId,
      value,
      referenceLow,
      referenceHigh,
      isAnomaly: false,
      zScore: 0,
    };

    const result: ProcessingResult = this.processor.processReading(reading);

    return {
      isAnomaly: result.isAnomaly || Math.abs(result.zScore) > this.zScoreThreshold,
      zScore: result.zScore,
      trend: result.currentTrend,
    };
  }

  /**
   * Get rolling statistics for a specific biomarker stream.
   */
  getStats(biomarkerId: string): StreamStats | null {
    return this.processor.getStats(biomarkerId);
  }

  /**
   * Get aggregate summary across all biomarker streams.
   */
  summary(): { totalReadings: number; anomalyRate: number } {
    const s: StreamSummary = this.processor.summary();
    return {
      totalReadings: s.totalReadings,
      anomalyRate: s.anomalyRate,
    };
  }
}
