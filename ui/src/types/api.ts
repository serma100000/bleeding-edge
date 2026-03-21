// Frontend DTOs - JSON-serializable versions of backend types

export type ClockName = 'altumage' | 'grimage' | 'deepstrataage' | 'epinflamm';
export type PipelineStatus = 'ingesting' | 'embedding' | 'inferring' | 'consensus' | 'proving' | 'indexing' | 'recommending' | 'complete' | 'failed';

export interface ClockResult {
  clockName: ClockName;
  biologicalAge: number;
  chronologicalAge: number;
  ageAcceleration: number;
  confidence: number;
  topContributingCpGs: CpGContribution[];
  modelHash: string;
  inferenceTimeMs: number;
}

export interface CpGContribution {
  probeId: string;
  betaValue: number;
  shapValue: number;
  direction: 'accelerating' | 'decelerating';
}

export interface ConsensusAge {
  consensusBiologicalAge: number;
  clockResults: ClockResult[];
  consensusMethod: 'raft' | 'weighted_average';
  tolerance: number;
  committedClocks: number;
  confidenceInterval: [number, number];
  agingVelocity?: number;
  weights: Record<ClockName, number>;
}

export interface AgeProof {
  proofBytes: string; // base64
  publicSignals: {
    biologicalAge: number;
    modelHash: string;
    timestamp: number;
    consensusMethod: string;
  };
  verificationKey: string; // base64
  circuitHash: string;
  provingTimeMs: number;
  proofSizeBytes: number;
}

export interface InterventionRecommendation {
  interventionName: string;
  category: 'exercise' | 'diet' | 'supplement' | 'pharmacological' | 'lifestyle';
  expectedEffectYears: number;
  evidenceLevel: 'strong' | 'moderate' | 'preliminary';
  relevantCpGs: string[];
  similarProfileCount: number;
  confidenceScore: number;
}

export interface PipelineMetrics {
  ingestionTimeMs: number;
  embeddingTimeMs: number;
  inferenceTimeMs: number;
  consensusTimeMs: number;
  provingTimeMs: number;
  indexingTimeMs: number;
  totalTimeMs: number;
}

export interface PipelineRun {
  runId: string;
  sampleId: string;
  status: PipelineStatus;
  startedAt: string;
  completedAt?: string;
  chronologicalAge: number;
  clockResults: ClockResult[];
  consensusAge?: ConsensusAge;
  proof?: AgeProof;
  recommendations: InterventionRecommendation[];
  error?: string;
  metrics: PipelineMetrics;
}

export interface CausalChain {
  cpg: string;
  gene: string;
  pathway: string;
  agingPhase: 'early_life' | 'early_midlife' | 'late_midlife' | 'late_life';
  evidenceStrength: number;
}

export interface TrajectoryPoint {
  timestamp: string;
  biologicalAge: number;
  chronologicalAge: number;
  confidenceInterval: [number, number];
}
