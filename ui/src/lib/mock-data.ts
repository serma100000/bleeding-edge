import type { PipelineRun, CausalChain, TrajectoryPoint } from '@/types/api';

export const MOCK_PIPELINE_RUN: PipelineRun = {
  runId: 'run-001',
  sampleId: 'sample-001',
  status: 'complete',
  startedAt: new Date(Date.now() - 180000).toISOString(),
  completedAt: new Date().toISOString(),
  chronologicalAge: 45,
  clockResults: [
    {
      clockName: 'altumage', biologicalAge: 42.3, chronologicalAge: 45, ageAcceleration: -2.7,
      confidence: 0.87, modelHash: 'a1b2c3d4e5f6', inferenceTimeMs: 234,
      topContributingCpGs: [
        { probeId: 'cg16867657', betaValue: 0.72, shapValue: -0.34, direction: 'decelerating' },
        { probeId: 'cg06639320', betaValue: 0.45, shapValue: 0.28, direction: 'accelerating' },
        { probeId: 'cg00481951', betaValue: 0.61, shapValue: -0.22, direction: 'decelerating' },
      ],
    },
    {
      clockName: 'grimage', biologicalAge: 43.8, chronologicalAge: 45, ageAcceleration: -1.2,
      confidence: 0.82, modelHash: 'b2c3d4e5f6a1', inferenceTimeMs: 312,
      topContributingCpGs: [
        { probeId: 'cg06639320', betaValue: 0.45, shapValue: 0.31, direction: 'accelerating' },
        { probeId: 'cg16867657', betaValue: 0.72, shapValue: -0.29, direction: 'decelerating' },
      ],
    },
    {
      clockName: 'deepstrataage', biologicalAge: 41.9, chronologicalAge: 45, ageAcceleration: -3.1,
      confidence: 0.91, modelHash: 'c3d4e5f6a1b2', inferenceTimeMs: 187,
      topContributingCpGs: [
        { probeId: 'cg16867657', betaValue: 0.72, shapValue: -0.41, direction: 'decelerating' },
        { probeId: 'cg00481951', betaValue: 0.61, shapValue: -0.18, direction: 'decelerating' },
      ],
    },
    {
      clockName: 'epinflamm', biologicalAge: 44.5, chronologicalAge: 45, ageAcceleration: -0.5,
      confidence: 0.73, modelHash: 'd4e5f6a1b2c3', inferenceTimeMs: 428,
      topContributingCpGs: [
        { probeId: 'cg06639320', betaValue: 0.45, shapValue: 0.15, direction: 'accelerating' },
      ],
    },
  ],
  consensusAge: {
    consensusBiologicalAge: 42.6,
    clockResults: [],
    consensusMethod: 'raft',
    tolerance: 5,
    committedClocks: 4,
    confidenceInterval: [40.8, 44.4],
    weights: { altumage: 0.4, grimage: 0.286, deepstrataage: 0.529, epinflamm: 0.143 },
  },
  proof: {
    proofBytes: btoa('mock-proof-bytes-'.repeat(600)),
    publicSignals: { biologicalAge: 42.6, modelHash: 'aggregate-hash-001', timestamp: Date.now(), consensusMethod: 'raft' },
    verificationKey: btoa('mock-vk'),
    circuitHash: 'circuit-hash-001',
    provingTimeMs: 87432,
    proofSizeBytes: 10240,
  },
  recommendations: [
    { interventionName: 'Moderate aerobic exercise 150min/week', category: 'exercise', expectedEffectYears: -1.5, evidenceLevel: 'strong', relevantCpGs: ['cg16867657', 'cg06639320'], similarProfileCount: 847, confidenceScore: 0.89 },
    { interventionName: 'Mediterranean diet adherence', category: 'diet', expectedEffectYears: -1.1, evidenceLevel: 'strong', relevantCpGs: ['cg00481951'], similarProfileCount: 623, confidenceScore: 0.84 },
    { interventionName: 'Metformin 500mg (off-label)', category: 'pharmacological', expectedEffectYears: -2.0, evidenceLevel: 'moderate', relevantCpGs: ['cg16867657'], similarProfileCount: 234, confidenceScore: 0.72 },
    { interventionName: 'Sleep optimization 7-9h', category: 'lifestyle', expectedEffectYears: -0.8, evidenceLevel: 'strong', relevantCpGs: ['cg06639320'], similarProfileCount: 1203, confidenceScore: 0.91 },
    { interventionName: 'Vitamin D 2000IU daily', category: 'supplement', expectedEffectYears: -0.5, evidenceLevel: 'moderate', relevantCpGs: ['cg00481951'], similarProfileCount: 456, confidenceScore: 0.67 },
  ],
  error: undefined,
  metrics: { ingestionTimeMs: 1243, embeddingTimeMs: 892, inferenceTimeMs: 1161, consensusTimeMs: 45, provingTimeMs: 87432, indexingTimeMs: 234, totalTimeMs: 91007 },
};

export const MOCK_CAUSAL_CHAINS: CausalChain[] = [
  { cpg: 'cg16867657', gene: 'ELOVL2', pathway: 'Fatty acid metabolism', agingPhase: 'late_midlife', evidenceStrength: 0.95 },
  { cpg: 'cg06639320', gene: 'FHL2', pathway: 'Cardiac development', agingPhase: 'early_midlife', evidenceStrength: 0.88 },
  { cpg: 'cg00481951', gene: 'CCDC102B', pathway: 'Cell cycle regulation', agingPhase: 'late_life', evidenceStrength: 0.82 },
  { cpg: 'cg22454769', gene: 'KLF14', pathway: 'Metabolic regulation', agingPhase: 'late_midlife', evidenceStrength: 0.79 },
  { cpg: 'cg07553761', gene: 'TRIM59', pathway: 'Immune regulation', agingPhase: 'early_midlife', evidenceStrength: 0.85 },
  { cpg: 'cg24724428', gene: 'ELOVL2', pathway: 'Fatty acid metabolism', agingPhase: 'late_midlife', evidenceStrength: 0.91 },
  { cpg: 'cg10523019', gene: 'SCGN', pathway: 'Calcium signaling', agingPhase: 'late_life', evidenceStrength: 0.76 },
];

export const MOCK_TRAJECTORY: TrajectoryPoint[] = [
  { timestamp: '2024-03-15', biologicalAge: 44.2, chronologicalAge: 43, confidenceInterval: [42.5, 45.9] },
  { timestamp: '2024-09-20', biologicalAge: 43.8, chronologicalAge: 43.5, confidenceInterval: [42.1, 45.5] },
  { timestamp: '2025-03-10', biologicalAge: 43.1, chronologicalAge: 44, confidenceInterval: [41.4, 44.8] },
  { timestamp: '2025-09-15', biologicalAge: 42.9, chronologicalAge: 44.5, confidenceInterval: [41.2, 44.6] },
  { timestamp: '2026-03-21', biologicalAge: 42.6, chronologicalAge: 45, confidenceInterval: [40.8, 44.4] },
];
