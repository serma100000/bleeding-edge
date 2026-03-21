import { ChronosAPI } from '../../src/orchestration/api';
import { ChronosFactory } from '../../src/orchestration/factory';
import type { AgeProof, SampleMetadata } from '../../src/shared/types';

// ── Test helpers ────────────────────────────────────────────────────

function generateCsvData(probeCount: number): string {
  const lines: string[] = [];
  for (let i = 0; i < probeCount; i++) {
    const probeId = `cg${String(i).padStart(8, '0')}`;
    const beta = (Math.sin(i * 0.1) + 1) / 2;
    lines.push(`${probeId},${beta.toFixed(6)}`);
  }
  return lines.join('\n');
}

function createValidMetadata(): SampleMetadata {
  return {
    chronologicalAge: 50,
    sex: 'F',
    tissueSource: 'whole_blood',
    collectionDate: '2025-06-01',
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ChronosAPI', () => {
  let api: ChronosAPI;

  beforeEach(() => {
    const components = ChronosFactory.create();
    api = new ChronosAPI(components);
  });

  describe('submitSample', () => {
    it('should return a runId string', async () => {
      const csv = generateCsvData(100);
      const metadata = createValidMetadata();

      const runId = await api.submitSample(csv, metadata);

      expect(typeof runId).toBe('string');
      expect(runId.length).toBeGreaterThan(0);
    });

    it('should store the pipeline run for later retrieval', async () => {
      const csv = generateCsvData(100);
      const metadata = createValidMetadata();

      const runId = await api.submitSample(csv, metadata);
      const result = api.getResult(runId);

      expect(result).toBeDefined();
      expect(result!.runId).toBe(runId);
      expect(result!.status).toBe('complete');
    });
  });

  describe('getResult', () => {
    it('should return a complete pipeline run', async () => {
      const csv = generateCsvData(100);
      const metadata = createValidMetadata();

      const runId = await api.submitSample(csv, metadata);
      const result = api.getResult(runId);

      expect(result).toBeDefined();
      expect(result!.status).toBe('complete');
      expect(result!.clockResults.length).toBe(4);
      expect(result!.consensusAge).toBeDefined();
      expect(result!.proof).toBeDefined();
      expect(result!.embedding).toBeInstanceOf(Float32Array);
    });

    it('should return undefined for unknown runId', () => {
      const result = api.getResult('nonexistent-run-id');
      expect(result).toBeUndefined();
    });
  });

  describe('verifyProof', () => {
    it('should return true for a valid proof', async () => {
      const csv = generateCsvData(100);
      const metadata = createValidMetadata();

      const runId = await api.submitSample(csv, metadata);
      const result = api.getResult(runId);

      expect(result).toBeDefined();
      expect(result!.proof).toBeDefined();

      const isValid = api.verifyProof(result!.proof!);
      expect(isValid).toBe(true);
    });

    it('should return false for a tampered proof', () => {
      const tamperedProof: AgeProof = {
        proofBytes: new Uint8Array(0),
        publicSignals: {
          biologicalAge: 45,
          modelHash: 'fake',
          timestamp: Date.now(),
          consensusMethod: 'raft',
        },
        verificationKey: new Uint8Array(32),
        circuitHash: 'fake-hash',
        provingTimeMs: 0,
        proofSizeBytes: 0,
      };

      const isValid = api.verifyProof(tamperedProof);
      expect(isValid).toBe(false);
    });
  });

  describe('getTrajectory', () => {
    it('should return trajectory points after submission', async () => {
      const csv = generateCsvData(100);
      const metadata = createValidMetadata();

      const runId = await api.submitSample(csv, metadata);
      const result = api.getResult(runId);

      // The subjectId is derived from the runId in the API
      const subjectId = `subject-${runId.slice(0, 8)}`;
      const trajectory = api.getTrajectory(subjectId);

      expect(trajectory.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for unknown subject', () => {
      const trajectory = api.getTrajectory('nonexistent-subject');
      expect(trajectory).toEqual([]);
    });
  });
});
