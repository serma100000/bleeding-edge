import { InterventionRecommender } from '../../src/knowledge/recommender.js';

function makeEmbedding(seed: number, dim = 8): Float32Array {
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    arr[i] = Math.sin(seed * (i + 1));
  }
  return arr;
}

describe('InterventionRecommender', () => {
  let recommender: InterventionRecommender;

  beforeEach(() => {
    recommender = new InterventionRecommender();
  });

  describe('recommend', () => {
    it('should return recommendations sorted by effect size (most negative first)', () => {
      // Add "younger" profiles (bio < chrono) with interventions
      recommender.addProfile('s1', makeEmbedding(1), 45, 50, [
        'Moderate aerobic exercise 150min/week',
        'Mediterranean diet adherence',
      ]);
      recommender.addProfile('s2', makeEmbedding(1.1), 42, 50, [
        'Metformin 500mg (off-label)',
        'Moderate aerobic exercise 150min/week',
      ]);

      const query = makeEmbedding(1.05);
      const recs = recommender.recommend(query, {}, 5);

      expect(recs.length).toBeGreaterThan(0);

      // Should be sorted by expectedEffectYears ascending (most negative first)
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i].expectedEffectYears).toBeGreaterThanOrEqual(
          recs[i - 1].expectedEffectYears,
        );
      }
    });

    it('should return empty for profiles with no similar younger matches', () => {
      // Only add "older" profiles (bio > chrono)
      recommender.addProfile('s1', makeEmbedding(1), 55, 50, ['Sleep optimization 7-9h']);
      recommender.addProfile('s2', makeEmbedding(2), 60, 50, ['Vitamin D 2000IU daily']);

      const query = makeEmbedding(1);
      const recs = recommender.recommend(query, {}, 5);
      expect(recs).toEqual([]);
    });

    it('should include similarProfileCount reflecting how many profiles used the intervention', () => {
      recommender.addProfile('s1', makeEmbedding(1), 45, 50, ['Sleep optimization 7-9h']);
      recommender.addProfile('s2', makeEmbedding(1.05), 44, 50, ['Sleep optimization 7-9h']);
      recommender.addProfile('s3', makeEmbedding(1.1), 43, 50, ['Vitamin D 2000IU daily']);

      const query = makeEmbedding(1);
      const recs = recommender.recommend(query, {}, 5);

      const sleep = recs.find(r => r.interventionName === 'Sleep optimization 7-9h');
      expect(sleep).toBeDefined();
      expect(sleep!.similarProfileCount).toBe(2);
    });

    it('should return empty when no profiles exist', () => {
      const query = makeEmbedding(1);
      const recs = recommender.recommend(query, {}, 5);
      expect(recs).toEqual([]);
    });

    it('should include proper fields on each recommendation', () => {
      recommender.addProfile('s1', makeEmbedding(1), 40, 50, [
        'Moderate aerobic exercise 150min/week',
      ]);

      const query = makeEmbedding(1);
      const recs = recommender.recommend(query, {}, 3);

      expect(recs.length).toBeGreaterThan(0);
      const rec = recs[0];
      expect(rec).toHaveProperty('interventionName');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('expectedEffectYears');
      expect(rec).toHaveProperty('evidenceLevel');
      expect(rec).toHaveProperty('relevantCpGs');
      expect(rec).toHaveProperty('similarProfileCount');
      expect(rec).toHaveProperty('confidenceScore');
      expect(rec.confidenceScore).toBeGreaterThan(0);
      expect(rec.confidenceScore).toBeLessThanOrEqual(1);
    });
  });
});
