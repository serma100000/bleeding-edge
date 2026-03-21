import { TemporalTracker } from '../../src/knowledge/temporal-tracker.js';
import type { ConsensusAge } from '../../src/shared/types.js';

function makeConsensusAge(bioAge: number): ConsensusAge {
  return {
    consensusBiologicalAge: bioAge,
    clockResults: [],
    consensusMethod: 'weighted_average',
    tolerance: 0.5,
    committedClocks: 4,
    confidenceInterval: [bioAge - 1, bioAge + 1],
    weights: {} as Record<string, number>,
  };
}

function makeEmbedding(dim = 8): Float32Array {
  return new Float32Array(dim).fill(0.5);
}

describe('TemporalTracker', () => {
  let tracker: TemporalTracker;

  beforeEach(() => {
    tracker = new TemporalTracker();
  });

  describe('getTrajectory', () => {
    it('should return empty for unknown subject', () => {
      expect(tracker.getTrajectory('unknown')).toEqual([]);
    });

    it('should return timepoints in chronological order', () => {
      const t1 = new Date('2024-01-01');
      const t2 = new Date('2024-07-01');
      const t3 = new Date('2025-01-01');

      // Add out of order
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), t3);
      tracker.addTimepoint('sub1', makeConsensusAge(48), makeEmbedding(), t1);
      tracker.addTimepoint('sub1', makeConsensusAge(49), makeEmbedding(), t2);

      const traj = tracker.getTrajectory('sub1');
      expect(traj).toHaveLength(3);
      expect(traj[0].consensusAge.consensusBiologicalAge).toBe(48);
      expect(traj[1].consensusAge.consensusBiologicalAge).toBe(49);
      expect(traj[2].consensusAge.consensusBiologicalAge).toBe(50);
    });
  });

  describe('getVelocity', () => {
    it('should compute positive velocity when bio age increases faster than chrono', () => {
      // Over 2 years, bio age goes from 50 to 54 — velocity ~2 bio-years/year
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2023-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(52), makeEmbedding(), new Date('2024-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(54), makeEmbedding(), new Date('2025-01-01'));

      const v = tracker.getVelocity('sub1');
      expect(v).toBeCloseTo(2.0, 1);
    });

    it('should compute velocity < 1 when aging slower than chrono', () => {
      // Over 2 years, bio age goes from 50 to 51 — velocity ~0.5
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2023-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(50.5), makeEmbedding(), new Date('2024-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(51), makeEmbedding(), new Date('2025-01-01'));

      const v = tracker.getVelocity('sub1');
      expect(v).toBeCloseTo(0.5, 1);
    });

    it('should return 0 for subject with fewer than 2 timepoints', () => {
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2024-01-01'));
      expect(tracker.getVelocity('sub1')).toBe(0);
    });

    it('should return 0 for unknown subject', () => {
      expect(tracker.getVelocity('unknown')).toBe(0);
    });
  });

  describe('detectAnomaly', () => {
    it('should flag sudden deviation as anomaly', () => {
      // Linear trajectory: 50, 51, 52 over 3 years, then jump to 60
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2022-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(51), makeEmbedding(), new Date('2023-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(52), makeEmbedding(), new Date('2024-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(60), makeEmbedding(), new Date('2025-01-01'));

      const result = tracker.detectAnomaly('sub1');
      expect(result.isAnomaly).toBe(true);
      expect(result.deviation).toBeGreaterThan(2);
    });

    it('should not flag consistent linear trajectory', () => {
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2022-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(51), makeEmbedding(), new Date('2023-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(52), makeEmbedding(), new Date('2024-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(53), makeEmbedding(), new Date('2025-01-01'));

      const result = tracker.detectAnomaly('sub1');
      expect(result.isAnomaly).toBe(false);
    });

    it('should return no anomaly for fewer than 3 timepoints', () => {
      tracker.addTimepoint('sub1', makeConsensusAge(50), makeEmbedding(), new Date('2023-01-01'));
      tracker.addTimepoint('sub1', makeConsensusAge(55), makeEmbedding(), new Date('2024-01-01'));

      const result = tracker.detectAnomaly('sub1');
      expect(result.isAnomaly).toBe(false);
      expect(result.deviation).toBe(0);
    });

    it('should return no anomaly for unknown subject', () => {
      const result = tracker.detectAnomaly('unknown');
      expect(result.isAnomaly).toBe(false);
      expect(result.deviation).toBe(0);
    });
  });
});
