// CHRONOS Shared Domain Types
// Based on DDD Bounded Contexts (docs/ddd/bounded-contexts.md)

// ============================================================
// Methylation Context Types
// ============================================================

export type ArrayType = 'illumina_450k' | 'illumina_epic' | 'illumina_epic_v2';
export type InputFormat = 'beta_csv' | 'idat' | 'geo_matrix';
export type TissueType = 'whole_blood' | 'saliva' | 'buccal' | 'brain' | 'liver' | 'other';
export type ProbeId = string; // e.g., "cg00000029"
export type BetaValue = number; // [0, 1]

export interface SampleMetadata {
  chronologicalAge: number;
  sex: 'M' | 'F';
  tissueSource: string;
  collectionDate: string;
  batchId?: string;
}

export interface QualityMetrics {
  meanDetectionP: number;
  probesPassedQC: number;
  totalProbes: number;
  bisulfiteConversion: number;
}

export interface MethylationSample {
  sampleId: string;
  subjectId: string;
  tissueType: TissueType;
  arrayType: ArrayType;
  cpgSites: Map<ProbeId, BetaValue>;
  metadata: SampleMetadata;
  qcMetrics: QualityMetrics;
}

// ============================================================
// Clock Context Types
// ============================================================

export type ClockName = 'altumage' | 'grimage' | 'deepstrataage' | 'epinflamm';

export interface CpGContribution {
  probeId: ProbeId;
  betaValue: BetaValue;
  shapValue: number;
  direction: 'accelerating' | 'decelerating';
}

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

// ============================================================
// Proof Context Types
// ============================================================

export interface CompiledCircuit {
  circuitBytes: Uint8Array;
  circuitHash: string;
  provingKey: Uint8Array;
  verificationKey: Uint8Array;
  compiledAt: Date;
  onnxModelHash: string;
  supportedOps: string[];
}

export interface MethylationWitness {
  betaValues: Float32Array;
  probeIds: ProbeId[];
  quantizationScale: number;
}

export interface AgeProof {
  proofBytes: Uint8Array;
  publicSignals: {
    biologicalAge: number;
    modelHash: string;
    timestamp: number;
    consensusMethod: string;
  };
  verificationKey: Uint8Array;
  circuitHash: string;
  provingTimeMs: number;
  proofSizeBytes: number;
}

// ============================================================
// Knowledge Context Types
// ============================================================

export interface CausalChain {
  cpg: ProbeId;
  gene: string;
  pathway: string;
  agingPhase: 'early_life' | 'early_midlife' | 'late_midlife' | 'late_life';
  evidenceStrength: number;
}

export interface InterventionRecommendation {
  interventionName: string;
  category: 'exercise' | 'diet' | 'supplement' | 'pharmacological' | 'lifestyle';
  expectedEffectYears: number;
  evidenceLevel: 'strong' | 'moderate' | 'preliminary';
  relevantCpGs: ProbeId[];
  similarProfileCount: number;
  confidenceScore: number;
}

export interface AgingProfile {
  subjectId: string;
  trajectoryPoints: TrajectoryPoint[];
  agingVelocity: number;
  interventions: AppliedIntervention[];
  recommendations: InterventionRecommendation[];
}

export interface TrajectoryPoint {
  timestamp: Date;
  consensusAge: ConsensusAge;
  embedding: Float32Array;
}

export interface AppliedIntervention {
  interventionName: string;
  startDate: Date;
  endDate?: Date;
  dosage?: string;
}

// ============================================================
// Orchestration Context Types
// ============================================================

export type PipelineStatus =
  | 'ingesting'
  | 'embedding'
  | 'inferring'
  | 'consensus'
  | 'proving'
  | 'indexing'
  | 'recommending'
  | 'complete'
  | 'failed';

export interface PipelineRun {
  runId: string;
  sampleId: string;
  status: PipelineStatus;
  startedAt: Date;
  completedAt?: Date;
  methylationSample?: MethylationSample;
  embedding?: Float32Array;
  clockResults: ClockResult[];
  consensusAge?: ConsensusAge;
  proof?: AgeProof;
  recommendations: InterventionRecommendation[];
  error?: string;
  metrics: PipelineMetrics;
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

// ============================================================
// Domain Events
// ============================================================

export type DomainEvent =
  | { type: 'MethylationSampleIngested'; sampleId: string; probeCount: number }
  | { type: 'MethylationSampleFailed'; sampleId: string; reason: string }
  | { type: 'CpGEmbeddingGenerated'; sampleId: string; dimensions: number }
  | { type: 'ClockInferenceCompleted'; clockName: ClockName; biologicalAge: number }
  | { type: 'ConsensusReached'; consensusAge: number; committedClocks: number }
  | { type: 'ConsensusFailed'; reason: string; clockResults: ClockResult[] }
  | { type: 'ProofGenerated'; circuitHash: string; provingTimeMs: number }
  | { type: 'ProofVerified'; valid: boolean }
  | { type: 'TrajectoryPointAdded'; subjectId: string; agingVelocity: number }
  | { type: 'InterventionRecommended'; count: number }
  | { type: 'AnomalyDetected'; subjectId: string; deviation: number };

export interface EventBus {
  emit(event: DomainEvent): void;
  on(type: DomainEvent['type'], handler: (event: DomainEvent) => void): void;
}

// ============================================================
// Genomics Context Types
// ============================================================

export interface GenomicProfile {
  subjectId: string;
  totalMarkers: number;
  build: string;
  cyp2d6: { allele1: string; allele2: string; phenotype: string; activity: number };
  cyp2c19: { allele1: string; allele2: string; phenotype: string; activity: number };
  apoe: { genotype: string };
  riskScores: { global: number; cancer: number; cardiovascular: number; neurological: number; metabolism: number };
  profileVector: number[]; // 64-dim serialized
  drugRecommendations: DrugRecommendation[];
}

export interface DrugRecommendation {
  drug: string;
  gene: string;
  phenotype: string;
  recommendation: string;
  doseFactor: number;
}
