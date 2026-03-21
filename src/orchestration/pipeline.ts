// CHRONOS Orchestration Context — Pipeline
// Orchestrates the full methylation-to-recommendation flow

import type {
  MethylationSample,
  PipelineRun,
  PipelineMetrics,
  PipelineStatus,
  ClockResult,
  ConsensusAge,
  AgeProof,
  InterventionRecommendation,
  AgingProfile,
} from '../shared/types.js';
import type { CpGEmbedder } from '../methylation/embedder.js';
import type { EpigeneticClock } from '../clocks/clock-interface.js';
import type { ClockConsensus } from '../clocks/consensus.js';
import type { ProofGenerator } from '../proofs/proof-generator.js';
import type { WitnessGenerator } from '../proofs/witness-generator.js';
import type { CircuitCompiler } from '../proofs/circuit-compiler.js';
import type { AgingKnowledgeGraph } from '../knowledge/knowledge-graph.js';
import type { InterventionRecommender } from '../knowledge/recommender.js';
import type { TemporalTracker } from '../knowledge/temporal-tracker.js';
import { validateQualityMetrics } from '../shared/validation.js';

interface PipelineDependencies {
  embedder: CpGEmbedder;
  clocks: EpigeneticClock[];
  consensus: ClockConsensus;
  circuitCompiler: CircuitCompiler;
  witnessGenerator: WitnessGenerator;
  proofGenerator: ProofGenerator;
  knowledgeGraph: AgingKnowledgeGraph;
  recommender: InterventionRecommender;
  temporalTracker: TemporalTracker;
}

export class ChronosPipeline {
  private readonly embedder: CpGEmbedder;
  private readonly clocks: EpigeneticClock[];
  private readonly consensus: ClockConsensus;
  private readonly circuitCompiler: CircuitCompiler;
  private readonly witnessGenerator: WitnessGenerator;
  private readonly proofGenerator: ProofGenerator;
  private readonly knowledgeGraph: AgingKnowledgeGraph;
  private readonly recommender: InterventionRecommender;
  private readonly temporalTracker: TemporalTracker;

  constructor(deps: PipelineDependencies) {
    this.embedder = deps.embedder;
    this.clocks = deps.clocks;
    this.consensus = deps.consensus;
    this.circuitCompiler = deps.circuitCompiler;
    this.witnessGenerator = deps.witnessGenerator;
    this.proofGenerator = deps.proofGenerator;
    this.knowledgeGraph = deps.knowledgeGraph;
    this.recommender = deps.recommender;
    this.temporalTracker = deps.temporalTracker;
  }

  async runPipeline(sample: MethylationSample): Promise<PipelineRun> {
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    const metrics: PipelineMetrics = {
      ingestionTimeMs: 0,
      embeddingTimeMs: 0,
      inferenceTimeMs: 0,
      consensusTimeMs: 0,
      provingTimeMs: 0,
      indexingTimeMs: 0,
      totalTimeMs: 0,
    };

    const run: PipelineRun = {
      runId,
      sampleId: sample.sampleId,
      status: 'ingesting',
      startedAt,
      clockResults: [],
      recommendations: [],
      metrics,
    };

    const pipelineStart = performance.now();

    try {
      // Stage 1: Validate sample (ingesting)
      run.status = 'ingesting';
      const ingestionStart = performance.now();
      validateQualityMetrics(sample.qcMetrics);
      run.methylationSample = sample;
      metrics.ingestionTimeMs = performance.now() - ingestionStart;

      // Stage 2: Generate embedding
      run.status = 'embedding';
      const embeddingStart = performance.now();
      const embedding = this.embedder.embed(sample);
      run.embedding = embedding;
      metrics.embeddingTimeMs = performance.now() - embeddingStart;

      // Stage 3: Run 4 clocks in parallel (inferring)
      run.status = 'inferring';
      const inferenceStart = performance.now();
      const clockResults = await Promise.all(
        this.clocks.map((clock) =>
          Promise.resolve(
            clock.predict(sample.cpgSites, sample.metadata.chronologicalAge),
          ),
        ),
      );
      run.clockResults = clockResults;
      metrics.inferenceTimeMs = performance.now() - inferenceStart;

      // Stage 4: Compute consensus
      run.status = 'consensus';
      const consensusStart = performance.now();
      const consensusAge = this.consensus.computeFromResults(
        clockResults,
        this.clocks,
      );
      run.consensusAge = consensusAge;
      metrics.consensusTimeMs = performance.now() - consensusStart;

      // Stage 5: Generate ZK proof (proving)
      run.status = 'proving';
      const provingStart = performance.now();
      const proof = this.generateProof(sample, consensusAge);
      run.proof = proof;
      metrics.provingTimeMs = performance.now() - provingStart;

      // Stage 6: Index in knowledge graph (indexing)
      run.status = 'indexing';
      const indexingStart = performance.now();
      this.indexInKnowledgeGraph(sample, consensusAge, embedding);
      metrics.indexingTimeMs = performance.now() - indexingStart;

      // Stage 7: Generate recommendations
      run.status = 'recommending';
      const recommendations = this.recommender.recommend(
        embedding,
        { subjectId: sample.subjectId },
        5,
      );
      run.recommendations = recommendations;

      // Complete
      run.status = 'complete';
      run.completedAt = new Date();
      metrics.totalTimeMs = performance.now() - pipelineStart;

      return run;
    } catch (error: unknown) {
      run.status = 'failed';
      run.error =
        error instanceof Error ? error.message : String(error);
      run.completedAt = new Date();
      metrics.totalTimeMs = performance.now() - pipelineStart;
      return run;
    }
  }

  private generateProof(
    sample: MethylationSample,
    consensusAge: ConsensusAge,
  ): AgeProof {
    // Compile a mock circuit from the consensus model hash
    const modelBuffer = Buffer.from(
      consensusAge.clockResults[0]?.modelHash ?? 'default',
    );
    const circuit = this.circuitCompiler.compile(modelBuffer);

    // Generate witness from probe subset
    const probeSubset = Array.from(sample.cpgSites.keys()).slice(0, 100);
    const witness = this.witnessGenerator.generateWitness(
      sample,
      probeSubset,
    );

    // Generate proof
    return this.proofGenerator.generateProof(
      circuit,
      witness,
      consensusAge.consensusBiologicalAge,
    );
  }

  private indexInKnowledgeGraph(
    sample: MethylationSample,
    consensusAge: ConsensusAge,
    embedding: Float32Array,
  ): void {
    this.temporalTracker.addTimepoint(
      sample.subjectId,
      consensusAge,
      embedding,
      new Date(),
    );
  }
}
