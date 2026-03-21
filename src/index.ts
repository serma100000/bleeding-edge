// CHRONOS Main Entry Point
// Cryptographically Honest, Reproducible, Orchestrated Network for Omics-based Senescence

import { ChronosAPI as _ChronosAPI } from './orchestration/api.js';

export { ChronosAPI } from './orchestration/api.js';
export { ChronosFactory, type ChronosComponents } from './orchestration/factory.js';
export { ChronosPipeline } from './orchestration/pipeline.js';

// Re-export key types
export type {
  MethylationSample,
  SampleMetadata,
  ClockResult,
  ConsensusAge,
  AgeProof,
  PipelineRun,
  PipelineMetrics,
  PipelineStatus,
  InterventionRecommendation,
  TrajectoryPoint,
  AgingProfile,
  EventBus,
  DomainEvent,
} from './shared/types.js';

/**
 * Convenience function: creates a fully wired CHRONOS system and returns the API.
 */
export function createChronos(): _ChronosAPI {
  return new _ChronosAPI();
}
