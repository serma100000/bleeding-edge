import { ClockConsensus } from '../../src/clocks/consensus.js';
import type { EpigeneticClock } from '../../src/clocks/clock-interface.js';
import type { ClockName, ClockResult } from '../../src/shared/types.js';

function makeMockClock(
  name: ClockName,
  mae: number,
  predictedAge: number,
): EpigeneticClock {
  return {
    name,
    mae,
    predict: (_cpg: Map<string, number>, chronologicalAge: number): ClockResult => ({
      clockName: name,
      biologicalAge: predictedAge,
      chronologicalAge,
      ageAcceleration: predictedAge - chronologicalAge,
      confidence: 0.9,
      topContributingCpGs: [],
      modelHash: `hash-${name}`,
      inferenceTimeMs: 1.0,
    }),
    getModelHash: () => `hash-${name}`,
  };
}

describe('ClockConsensus', () => {
  const emptyCpg = new Map<string, number>();
  const chronoAge = 50;

  describe('weighted average calculation', () => {
    it('should compute correct consensus when all 4 clocks agree closely', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 52),
        makeMockClock('grimage', 3.5, 53),
        makeMockClock('deepstrataage', 1.89, 51),
        makeMockClock('epinflamm', 7.0, 52),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      // All within epsilon=5 of weighted avg, so committedClocks = 4
      expect(result.committedClocks).toBe(4);

      // Weighted average: w_k = 1/MAE_k
      const w1 = 1 / 2.5;
      const w2 = 1 / 3.5;
      const w3 = 1 / 1.89;
      const w4 = 1 / 7.0;
      const totalW = w1 + w2 + w3 + w4;
      const expected = (w1 * 52 + w2 * 53 + w3 * 51 + w4 * 52) / totalW;

      expect(result.consensusBiologicalAge).toBeCloseTo(expected, 5);
    });

    it('should assign correct inverse-MAE weights', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 50),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 50),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      const w1 = 1 / 2.5;
      const w2 = 1 / 3.5;
      const w3 = 1 / 1.89;
      const w4 = 1 / 7.0;
      const totalW = w1 + w2 + w3 + w4;

      expect(result.weights['altumage']).toBeCloseTo(w1 / totalW, 5);
      expect(result.weights['grimage']).toBeCloseTo(w2 / totalW, 5);
      expect(result.weights['deepstrataage']).toBeCloseTo(w3 / totalW, 5);
      expect(result.weights['epinflamm']).toBeCloseTo(w4 / totalW, 5);
    });
  });

  describe('commitment (3 of 4 rule)', () => {
    it('should exclude 1 outlier and have committedClocks = 3', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 52),
        makeMockClock('grimage', 3.5, 53),
        makeMockClock('deepstrataage', 1.89, 51),
        makeMockClock('epinflamm', 7.0, 80), // outlier
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.committedClocks).toBe(3);

      // Consensus should be based on committed clocks only
      const w1 = 1 / 2.5;
      const w2 = 1 / 3.5;
      const w3 = 1 / 1.89;
      const totalW = w1 + w2 + w3;
      const expected = (w1 * 52 + w2 * 53 + w3 * 51) / totalW;

      expect(result.consensusBiologicalAge).toBeCloseTo(expected, 5);
    });

    it('should fail consensus when 2 outlier clocks (committedClocks < 3)', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 52),
        makeMockClock('grimage', 3.5, 80),
        makeMockClock('deepstrataage', 1.89, 51),
        makeMockClock('epinflamm', 7.0, 90),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.committedClocks).toBeLessThan(3);
    });
  });

  describe('confidence interval', () => {
    it('should compute 95% CI correctly', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 50),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 50),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      // All predict 50, so variance = 0, CI collapses
      expect(result.confidenceInterval[0]).toBeCloseTo(50, 5);
      expect(result.confidenceInterval[1]).toBeCloseTo(50, 5);
    });

    it('should produce wider CI with more disagreement', () => {
      const narrowClocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 50),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 50),
      ];

      const wideClocks = [
        makeMockClock('altumage', 2.5, 48),
        makeMockClock('grimage', 3.5, 52),
        makeMockClock('deepstrataage', 1.89, 47),
        makeMockClock('epinflamm', 7.0, 53),
      ];

      const consensus = new ClockConsensus();
      const narrowResult = consensus.computeConsensus(narrowClocks, emptyCpg, chronoAge);
      const wideResult = consensus.computeConsensus(wideClocks, emptyCpg, chronoAge);

      const narrowWidth =
        narrowResult.confidenceInterval[1] - narrowResult.confidenceInterval[0];
      const wideWidth =
        wideResult.confidenceInterval[1] - wideResult.confidenceInterval[0];

      expect(wideWidth).toBeGreaterThan(narrowWidth);
    });

    it('should have CI = consensus +/- 1.96 * sqrt(weighted_variance)', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 48),
        makeMockClock('grimage', 3.5, 52),
        makeMockClock('deepstrataage', 1.89, 49),
        makeMockClock('epinflamm', 7.0, 51),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      const ages = [48, 52, 49, 51];
      const maes = [2.5, 3.5, 1.89, 7.0];
      const rawW = maes.map((m) => 1 / m);
      const totalW = rawW.reduce((a, b) => a + b, 0);
      const normW = rawW.map((w) => w / totalW);

      const cAge = result.consensusBiologicalAge;
      let variance = 0;
      for (let i = 0; i < ages.length; i++) {
        variance += normW[i] * (ages[i] - cAge) ** 2;
      }

      const halfWidth = 1.96 * Math.sqrt(variance);
      expect(result.confidenceInterval[0]).toBeCloseTo(cAge - halfWidth, 5);
      expect(result.confidenceInterval[1]).toBeCloseTo(cAge + halfWidth, 5);
    });
  });

  describe('edge cases', () => {
    it('should handle all clocks predicting exact same age', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 55),
        makeMockClock('grimage', 3.5, 55),
        makeMockClock('deepstrataage', 1.89, 55),
        makeMockClock('epinflamm', 7.0, 55),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.consensusBiologicalAge).toBeCloseTo(55, 5);
      expect(result.committedClocks).toBe(4);
      expect(result.confidenceInterval[0]).toBeCloseTo(55, 5);
      expect(result.confidenceInterval[1]).toBeCloseTo(55, 5);
    });

    it('should use custom epsilon for commitment tolerance', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 53),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 50),
      ];

      // With very tight epsilon, the grimage outlier gets excluded
      const tightConsensus = new ClockConsensus({ epsilon: 1.0 });
      const result = tightConsensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.tolerance).toBe(1.0);
      expect(result.committedClocks).toBeLessThanOrEqual(4);
    });

    it('should return all 4 clock results regardless of commitment', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 80),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 90),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.clockResults).toHaveLength(4);
      expect(result.clockResults.map((r) => r.clockName)).toEqual(
        expect.arrayContaining(['altumage', 'grimage', 'deepstrataage', 'epinflamm']),
      );
    });

    it('should set consensusMethod to weighted_average', () => {
      const clocks = [
        makeMockClock('altumage', 2.5, 50),
        makeMockClock('grimage', 3.5, 50),
        makeMockClock('deepstrataage', 1.89, 50),
        makeMockClock('epinflamm', 7.0, 50),
      ];

      const consensus = new ClockConsensus();
      const result = consensus.computeConsensus(clocks, emptyCpg, chronoAge);

      expect(result.consensusMethod).toBe('weighted_average');
    });
  });
});
