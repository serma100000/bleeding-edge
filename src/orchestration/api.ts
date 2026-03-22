// CHRONOS Orchestration Context — Public API
// High-level API for submitting samples and querying results

import type {
  AgeProof,
  PipelineRun,
  SampleMetadata,
  TrajectoryPoint,
} from '../shared/types.js';
import { MethylationParser } from '../methylation/parser.js';
import { ProofVerifier } from '../proofs/proof-verifier.js';
import { ChronosFactory, type ChronosComponents } from './factory.js';

export class ChronosAPI {
  private readonly runs = new Map<string, PipelineRun>();
  private readonly components: ChronosComponents;
  private readonly parser = new MethylationParser();
  private readonly verifier: ProofVerifier;

  constructor(components?: ChronosComponents) {
    this.components = components ?? ChronosFactory.create();
    this.verifier = this.components.proofVerifier;
  }

  /** Create an API instance with fully initialized persistent stores */
  static async createAsync(): Promise<ChronosAPI> {
    const components = await ChronosFactory.createAsync();
    return new ChronosAPI(components);
  }

  async submitSample(
    csvData: string,
    metadata: SampleMetadata,
  ): Promise<string> {
    const runId = crypto.randomUUID();

    const sample = this.parser.parseSingleSampleCsv(csvData, {
      sampleId: runId,
      subjectId: `subject-${runId.slice(0, 8)}`,
      tissueType: 'whole_blood',
      arrayType: 'illumina_epic',
      metadata,
      qcMetrics: {
        meanDetectionP: 0.005,
        probesPassedQC: 850000,
        totalProbes: 866091,
        bisulfiteConversion: 0.98,
      },
    });

    const pipelineRun = await this.components.pipeline.runPipeline(sample);

    // Override the runId to match what we generated
    const storedRun: PipelineRun = { ...pipelineRun, runId };
    this.runs.set(runId, storedRun);

    return runId;
  }

  getResult(runId: string): PipelineRun | undefined {
    return this.runs.get(runId);
  }

  verifyProof(proof: AgeProof): boolean {
    return this.verifier.verify(proof);
  }

  getTrajectory(subjectId: string): TrajectoryPoint[] {
    return this.components.temporalTracker.getTrajectory(subjectId);
  }
}
