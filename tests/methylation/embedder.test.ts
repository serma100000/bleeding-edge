import { CpGEmbedder } from '../../src/methylation/embedder.js';
import { MethylationSample } from '../../src/shared/types.js';

function makeSample(probeCount: number, fill: number = 0.5): MethylationSample {
  const cpgSites = new Map<string, number>();
  for (let i = 0; i < probeCount; i++) {
    const id = `cg${String(i).padStart(8, '0')}`;
    cpgSites.set(id, fill);
  }
  return {
    sampleId: 'S001',
    subjectId: 'SUB001',
    tissueType: 'whole_blood',
    arrayType: 'illumina_epic',
    cpgSites,
    metadata: {
      chronologicalAge: 45,
      sex: 'F',
      tissueSource: 'whole blood',
      collectionDate: '2025-01-15',
    },
    qcMetrics: {
      meanDetectionP: 0.005,
      probesPassedQC: 860000,
      totalProbes: 865000,
      bisulfiteConversion: 0.98,
    },
  };
}

describe('CpGEmbedder', () => {
  const INPUT_DIM = 100;
  const OUTPUT_DIM = 256;
  const SEED = 42;

  it('should produce embedding with correct dimensions (256)', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED));
    const sample = makeSample(INPUT_DIM);
    const embedding = embedder.embed(sample);

    expect(embedding).toBeInstanceOf(Float32Array);
    expect(embedding.length).toBe(256);
  });

  it('should produce embedding values in [-1, 1] (tanh output)', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED));
    const sample = makeSample(INPUT_DIM, 0.9);
    const embedding = embedder.embed(sample);

    for (let i = 0; i < embedding.length; i++) {
      expect(embedding[i]).toBeGreaterThanOrEqual(-1);
      expect(embedding[i]).toBeLessThanOrEqual(1);
    }
  });

  it('should produce same embedding for same input (deterministic)', () => {
    const matrix = CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED);
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, new Float32Array(matrix));
    const sample = makeSample(INPUT_DIM);

    const embedding1 = embedder.embed(sample);
    const embedding2 = embedder.embed(sample);

    expect(Array.from(embedding1)).toEqual(Array.from(embedding2));
  });

  it('should produce different embeddings for different inputs', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED));
    const sample1 = makeSample(INPUT_DIM, 0.1);
    const sample2 = makeSample(INPUT_DIM, 0.9);

    const embedding1 = embedder.embed(sample1);
    const embedding2 = embedder.embed(sample2);

    // At least some values should differ
    let different = false;
    for (let i = 0; i < embedding1.length; i++) {
      if (Math.abs(embedding1[i] - embedding2[i]) > 1e-6) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('should generate a reproducible random projection matrix with seed', () => {
    const m1 = CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED);
    const m2 = CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED);
    expect(Array.from(m1)).toEqual(Array.from(m2));
  });

  it('should support save and load of projection matrix', () => {
    const embedder1 = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED));
    const saved = embedder1.getProjectionMatrix();

    const embedder2 = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM);
    embedder2.loadProjectionMatrix(saved);

    const sample = makeSample(INPUT_DIM);
    const e1 = embedder1.embed(sample);
    const e2 = embedder2.embed(sample);

    expect(Array.from(e1)).toEqual(Array.from(e2));
  });

  it('should throw on projection matrix size mismatch in constructor', () => {
    const wrongSize = new Float32Array(10);
    expect(() => new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, wrongSize)).toThrow(
      /size mismatch/
    );
  });

  it('should throw on projection matrix size mismatch in loadProjectionMatrix', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM);
    const wrongSize = new Float32Array(10);
    expect(() => embedder.loadProjectionMatrix(wrongSize)).toThrow(/size mismatch/);
  });

  it('should throw on raw input dimension mismatch', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM);
    const wrongInput = new Float32Array(50);
    expect(() => embedder.embedRaw(wrongInput)).toThrow(/dimension mismatch/);
  });

  it('should zero-pad when sample has fewer probes than inputDim', () => {
    const embedder = new CpGEmbedder(INPUT_DIM, OUTPUT_DIM, CpGEmbedder.generateRandomProjection(INPUT_DIM, OUTPUT_DIM, SEED));
    const sample = makeSample(10, 0.5); // Only 10 probes, inputDim=100
    const embedding = embedder.embed(sample);

    expect(embedding.length).toBe(256);
    // Should not throw and should produce valid values
    for (let i = 0; i < embedding.length; i++) {
      expect(embedding[i]).toBeGreaterThanOrEqual(-1);
      expect(embedding[i]).toBeLessThanOrEqual(1);
    }
  });
});
