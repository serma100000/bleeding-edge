import { MethylationStore } from '../../src/methylation/store.js';
import { MethylationSample } from '../../src/shared/types.js';

function makeSample(id: string): MethylationSample {
  const cpgSites = new Map<string, number>();
  cpgSites.set('cg00000001', 0.5);
  cpgSites.set('cg00000002', 0.7);
  return {
    sampleId: id,
    subjectId: `SUB_${id}`,
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

function makeEmbedding(values: number[]): Float32Array {
  return new Float32Array(values);
}

describe('MethylationStore', () => {
  let store: MethylationStore;

  beforeEach(() => {
    store = new MethylationStore();
  });

  describe('store and retrieve', () => {
    it('should store and retrieve a sample', () => {
      const sample = makeSample('S001');
      const embedding = makeEmbedding([1, 0, 0, 0]);

      store.store(sample, embedding);
      const entry = store.retrieve('S001');

      expect(entry).toBeDefined();
      expect(entry!.sample.sampleId).toBe('S001');
      expect(entry!.embedding.length).toBe(4);
      expect(entry!.embedding[0]).toBe(1);
    });

    it('should return undefined for non-existent sample', () => {
      expect(store.retrieve('NONEXISTENT')).toBeUndefined();
    });

    it('should overwrite on duplicate sampleId', () => {
      const sample1 = makeSample('S001');
      const sample2 = makeSample('S001');
      sample2.metadata.chronologicalAge = 50;

      store.store(sample1, makeEmbedding([1, 0, 0, 0]));
      store.store(sample2, makeEmbedding([0, 1, 0, 0]));

      expect(store.count()).toBe(1);
      const entry = store.retrieve('S001');
      expect(entry!.sample.metadata.chronologicalAge).toBe(50);
      expect(entry!.embedding[1]).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete an existing sample and return true', () => {
      store.store(makeSample('S001'), makeEmbedding([1, 0, 0, 0]));
      expect(store.delete('S001')).toBe(true);
      expect(store.retrieve('S001')).toBeUndefined();
      expect(store.count()).toBe(0);
    });

    it('should return false when deleting non-existent sample', () => {
      expect(store.delete('NONEXISTENT')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 for empty store', () => {
      expect(store.count()).toBe(0);
    });

    it('should return correct count after multiple stores', () => {
      store.store(makeSample('S001'), makeEmbedding([1, 0, 0, 0]));
      store.store(makeSample('S002'), makeEmbedding([0, 1, 0, 0]));
      store.store(makeSample('S003'), makeEmbedding([0, 0, 1, 0]));
      expect(store.count()).toBe(3);
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      store.store(makeSample('S001'), makeEmbedding([1, 0]));
      store.store(makeSample('S002'), makeEmbedding([0, 1]));

      const metrics = store.getMetrics();
      expect(metrics.samplesStored).toBe(2);
      // Each sample has 2 probes
      expect(metrics.totalProbesIndexed).toBe(4);
    });
  });

  describe('findSimilar', () => {
    it('should return nearest neighbors by cosine similarity', () => {
      // Store three samples with known embeddings
      store.store(makeSample('S001'), makeEmbedding([1, 0, 0, 0]));
      store.store(makeSample('S002'), makeEmbedding([0.9, 0.1, 0, 0]));
      store.store(makeSample('S003'), makeEmbedding([0, 0, 0, 1]));

      const query = makeEmbedding([1, 0, 0, 0]);
      const results = store.findSimilar(query, 2);

      expect(results).toHaveLength(2);
      expect(results[0].sampleId).toBe('S001');
      expect(results[0].similarity).toBeCloseTo(1.0);
      expect(results[1].sampleId).toBe('S002');
      expect(results[1].similarity).toBeGreaterThan(0.9);
    });

    it('should exclude sample by excludeId', () => {
      store.store(makeSample('S001'), makeEmbedding([1, 0, 0, 0]));
      store.store(makeSample('S002'), makeEmbedding([0.9, 0.1, 0, 0]));

      const query = makeEmbedding([1, 0, 0, 0]);
      const results = store.findSimilar(query, 5, 'S001');

      expect(results).toHaveLength(1);
      expect(results[0].sampleId).toBe('S002');
    });

    it('should return empty array when store is empty', () => {
      const query = makeEmbedding([1, 0, 0, 0]);
      const results = store.findSimilar(query);
      expect(results).toHaveLength(0);
    });

    it('should respect k limit', () => {
      store.store(makeSample('S001'), makeEmbedding([1, 0, 0, 0]));
      store.store(makeSample('S002'), makeEmbedding([0.9, 0.1, 0, 0]));
      store.store(makeSample('S003'), makeEmbedding([0.8, 0.2, 0, 0]));

      const query = makeEmbedding([1, 0, 0, 0]);
      const results = store.findSimilar(query, 1);

      expect(results).toHaveLength(1);
      expect(results[0].sampleId).toBe('S001');
    });

    it('should handle zero vectors gracefully', () => {
      store.store(makeSample('S001'), makeEmbedding([0, 0, 0, 0]));
      const query = makeEmbedding([1, 0, 0, 0]);
      const results = store.findSimilar(query);

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0);
    });
  });
});
