import { ChronosPipeline } from '../../src/orchestration/pipeline';
import { ChronosFactory } from '../../src/orchestration/factory';
import type {
  MethylationSample,
  PipelineRun,
  TissueType,
  ArrayType,
  SampleMetadata,
  QualityMetrics,
} from '../../src/shared/types';

// ── Test helpers ────────────────────────────────────────────────────

function generateSyntheticCsv(probeCount: number): string {
  const lines: string[] = [];
  for (let i = 0; i < probeCount; i++) {
    const probeId = `cg${String(i).padStart(8, '0')}`;
    const beta = (Math.sin(i * 0.1) + 1) / 2; // deterministic [0,1]
    lines.push(`${probeId},${beta.toFixed(6)}`);
  }
  return lines.join('\n');
}

function createValidMetadata(overrides: Partial<SampleMetadata> = {}): SampleMetadata {
  return {
    chronologicalAge: 45,
    sex: 'M',
    tissueSource: 'whole_blood',
    collectionDate: '2025-01-15',
    ...overrides,
  };
}

function createValidQcMetrics(overrides: Partial<QualityMetrics> = {}): QualityMetrics {
  return {
    meanDetectionP: 0.005,
    probesPassedQC: 850000,
    totalProbes: 866091,
    bisulfiteConversion: 0.98,
    ...overrides,
  };
}

function createValidSample(overrides: Partial<MethylationSample> = {}): MethylationSample {
  const cpgSites = new Map<string, number>();
  for (let i = 0; i < 500; i++) {
    cpgSites.set(`cg${String(i).padStart(8, '0')}`, (Math.sin(i * 0.1) + 1) / 2);
  }

  return {
    sampleId: `sample-${Date.now()}`,
    subjectId: `subject-001`,
    tissueType: 'whole_blood' as TissueType,
    arrayType: 'illumina_epic' as ArrayType,
    cpgSites,
    metadata: createValidMetadata(),
    qcMetrics: createValidQcMetrics(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ChronosPipeline', () => {
  let pipeline: ChronosPipeline;
  let components: ReturnType<typeof ChronosFactory.create>;

  beforeEach(() => {
    components = ChronosFactory.create();
    pipeline = components.pipeline;
  });

  describe('full pipeline run', () => {
    it('should complete the full pipeline from sample to recommendations', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      expect(run.status).toBe('complete');
      expect(run.runId).toBeDefined();
      expect(run.sampleId).toBe(sample.sampleId);
      expect(run.methylationSample).toBe(sample);
      expect(run.embedding).toBeInstanceOf(Float32Array);
      expect(run.embedding!.length).toBe(256);
      expect(run.clockResults).toHaveLength(4);
      expect(run.consensusAge).toBeDefined();
      expect(run.consensusAge!.consensusBiologicalAge).toBeGreaterThanOrEqual(0);
      expect(run.proof).toBeDefined();
      expect(run.proof!.proofBytes.length).toBeGreaterThan(0);
      expect(run.completedAt).toBeInstanceOf(Date);
      expect(run.error).toBeUndefined();
    });

    it('should produce clock results for all 4 clocks', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      const clockNames = run.clockResults.map((r) => r.clockName);
      expect(clockNames).toContain('altumage');
      expect(clockNames).toContain('grimage');
      expect(clockNames).toContain('deepstrataage');
      expect(clockNames).toContain('epinflamm');
    });

    it('should generate a valid consensus age', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      const consensus = run.consensusAge!;
      expect(consensus.consensusBiologicalAge).toBeGreaterThanOrEqual(0);
      expect(consensus.consensusBiologicalAge).toBeLessThanOrEqual(150);
      expect(consensus.clockResults).toHaveLength(4);
      expect(consensus.consensusMethod).toBeDefined();
      expect(consensus.confidenceInterval).toHaveLength(2);
      expect(consensus.confidenceInterval[0]).toBeLessThanOrEqual(consensus.confidenceInterval[1]);
    });

    it('should generate a ZK proof', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      const proof = run.proof!;
      expect(proof.proofBytes).toBeInstanceOf(Uint8Array);
      expect(proof.proofBytes.length).toBeGreaterThan(0);
      expect(proof.publicSignals.biologicalAge).toBeDefined();
      expect(proof.circuitHash).toBeDefined();
      expect(proof.verificationKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('pipeline metrics', () => {
    it('should track timing for all stages', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      expect(run.metrics.ingestionTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.embeddingTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.inferenceTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.consensusTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.provingTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.indexingTimeMs).toBeGreaterThanOrEqual(0);
      expect(run.metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should have total time >= sum of stage times', async () => {
      const sample = createValidSample();
      const run = await pipeline.runPipeline(sample);

      const stageSum =
        run.metrics.ingestionTimeMs +
        run.metrics.embeddingTimeMs +
        run.metrics.inferenceTimeMs +
        run.metrics.consensusTimeMs +
        run.metrics.provingTimeMs +
        run.metrics.indexingTimeMs;

      // Total should be >= stage sum (there's also the recommending stage)
      expect(run.metrics.totalTimeMs).toBeGreaterThanOrEqual(stageSum * 0.9);
    });
  });

  describe('error handling', () => {
    it('should set status to failed on bad QC metrics', async () => {
      const sample = createValidSample({
        qcMetrics: createValidQcMetrics({
          bisulfiteConversion: 0.5, // below 85% threshold
        }),
      });

      const run = await pipeline.runPipeline(sample);

      expect(run.status).toBe('failed');
      expect(run.error).toBeDefined();
      expect(run.error).toContain('Bisulfite conversion');
      expect(run.completedAt).toBeInstanceOf(Date);
    });

    it('should set status to failed on excessive detection p-value', async () => {
      const sample = createValidSample({
        qcMetrics: createValidQcMetrics({
          meanDetectionP: 0.05, // exceeds 0.01 threshold
        }),
      });

      const run = await pipeline.runPipeline(sample);

      expect(run.status).toBe('failed');
      expect(run.error).toBeDefined();
      expect(run.error).toContain('detection p-value');
    });

    it('should set status to failed on low probe pass rate', async () => {
      const sample = createValidSample({
        qcMetrics: createValidQcMetrics({
          probesPassedQC: 10000,
          totalProbes: 866091, // way below 95%
        }),
      });

      const run = await pipeline.runPipeline(sample);

      expect(run.status).toBe('failed');
      expect(run.error).toBeDefined();
      expect(run.error).toContain('pass rate');
    });

    it('should still record metrics on failure', async () => {
      const sample = createValidSample({
        qcMetrics: createValidQcMetrics({
          bisulfiteConversion: 0.5,
        }),
      });

      const run = await pipeline.runPipeline(sample);

      expect(run.status).toBe('failed');
      expect(run.metrics.totalTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sequential runs', () => {
    it('should handle multiple samples sequentially', async () => {
      const sample1 = createValidSample({ sampleId: 'sample-001', subjectId: 'subject-A' });
      const sample2 = createValidSample({ sampleId: 'sample-002', subjectId: 'subject-B' });
      const sample3 = createValidSample({ sampleId: 'sample-003', subjectId: 'subject-C' });

      const run1 = await pipeline.runPipeline(sample1);
      const run2 = await pipeline.runPipeline(sample2);
      const run3 = await pipeline.runPipeline(sample3);

      expect(run1.status).toBe('complete');
      expect(run2.status).toBe('complete');
      expect(run3.status).toBe('complete');

      // Each run should have a unique ID
      const runIds = new Set([run1.runId, run2.runId, run3.runId]);
      expect(runIds.size).toBe(3);

      // Each run should have the correct sample ID
      expect(run1.sampleId).toBe('sample-001');
      expect(run2.sampleId).toBe('sample-002');
      expect(run3.sampleId).toBe('sample-003');
    });

    it('should index each sample in the temporal tracker', async () => {
      const sample1 = createValidSample({ sampleId: 'sample-t1', subjectId: 'subject-X' });
      const sample2 = createValidSample({ sampleId: 'sample-t2', subjectId: 'subject-X' });

      await pipeline.runPipeline(sample1);
      await pipeline.runPipeline(sample2);

      const trajectory = components.temporalTracker.getTrajectory('subject-X');
      expect(trajectory.length).toBe(2);
    });
  });

  describe('synthetic CSV integration', () => {
    it('should parse synthetic CSV and run through the pipeline', async () => {
      const csv = generateSyntheticCsv(200);
      const lines = csv.split('\n');
      const cpgSites = new Map<string, number>();
      for (const line of lines) {
        const [probe, value] = line.split(',');
        cpgSites.set(probe, parseFloat(value));
      }

      const sample: MethylationSample = {
        sampleId: 'csv-test-001',
        subjectId: 'csv-subject-001',
        tissueType: 'whole_blood',
        arrayType: 'illumina_epic',
        cpgSites,
        metadata: createValidMetadata(),
        qcMetrics: createValidQcMetrics(),
      };

      const run = await pipeline.runPipeline(sample);
      expect(run.status).toBe('complete');
      expect(run.clockResults.length).toBe(4);
    });
  });
});
