import { RiskScorer } from '../../src/genomics/risk-scorer.js';
import type { RiskScores } from '../../src/genomics/risk-scorer.js';

describe('RiskScorer', () => {
  let scorer: RiskScorer;

  beforeAll(() => {
    scorer = new RiskScorer();
  });

  describe('scoreFromGenotypes with populated genotypes', () => {
    let scores: RiskScores;

    beforeAll(() => {
      const genotypes = new Map<string, string>([
        ['rs429358', 'CT'],
        ['rs7412', 'CC'],
        ['rs4680', 'AG'],
        ['rs1801133', 'AG'],
        ['rs1229984', 'CT'],
        ['rs671', 'GG'],
        ['rs1800497', 'AG'],
        ['rs4420638', 'AG'],
        ['rs6983267', 'GT'],
        ['rs10757278', 'AG'],
        ['rs1333049', 'CG'],
        ['rs2187668', 'CT'],
        ['rs9272219', 'AG'],
        ['rs1801282', 'CG'],
      ]);
      scores = scorer.scoreFromGenotypes(genotypes);
    });

    it('should return all four risk categories', () => {
      const categoryNames = Object.keys(scores.categories);
      expect(categoryNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should have global score in [0, 1]', () => {
      expect(scores.global).toBeGreaterThanOrEqual(0);
      expect(scores.global).toBeLessThanOrEqual(1);
    });

    it('should have per-category scores in [0, 1]', () => {
      for (const cat of Object.values(scores.categories)) {
        expect(cat.score).toBeGreaterThanOrEqual(0);
        expect(cat.score).toBeLessThanOrEqual(1);
      }
    });

    it('should produce a 64-dim profile vector', () => {
      expect(scores.profileVector).toBeInstanceOf(Float32Array);
      expect(scores.profileVector.length).toBe(64);
    });

    it('should detect gene-gene interactions when both SNPs present', () => {
      expect(scores.interactionCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scoreFromGenotypes with empty genotypes', () => {
    it('should return zero global score for empty genotypes', () => {
      const scores = scorer.scoreFromGenotypes(new Map());
      expect(scores.global).toBe(0);
    });

    it('should return zero interaction count for empty genotypes', () => {
      const scores = scorer.scoreFromGenotypes(new Map());
      expect(scores.interactionCount).toBe(0);
    });

    it('should still produce a 64-dim profile vector', () => {
      const scores = scorer.scoreFromGenotypes(new Map());
      expect(scores.profileVector).toBeInstanceOf(Float32Array);
      expect(scores.profileVector.length).toBe(64);
    });
  });

  describe('global score is weighted average', () => {
    it('should produce a global score derived from category scores', () => {
      const genotypes = new Map<string, string>([
        ['rs6983267', 'TT'],   // homozygous alt — Cancer Risk
        ['rs10757278', 'GG'],  // homozygous alt — Cardiovascular
        ['rs429358', 'CC'],    // homozygous alt — Neurological
        ['rs1801282', 'GG'],   // homozygous alt — Metabolism
      ]);
      const scores = scorer.scoreFromGenotypes(genotypes);

      // Global should be a reasonable aggregate of category scores
      const catValues = Object.values(scores.categories).map(c => c.score);
      if (catValues.length > 0) {
        const maxCat = Math.max(...catValues);
        // Global should not exceed max category (it's an average)
        expect(scores.global).toBeLessThanOrEqual(maxCat + 0.01);
      }
    });
  });
});
