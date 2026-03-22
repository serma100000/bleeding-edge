import { BiomarkerStreamProcessor } from '../../src/genomics/streaming.js';

describe('BiomarkerStreamProcessor', () => {
  describe('normal readings', () => {
    it('should not flag normal-range readings as anomalies', () => {
      const processor = new BiomarkerStreamProcessor({ windowSize: 50 });

      // Feed steady readings first to establish baseline
      for (let i = 0; i < 30; i++) {
        processor.processReading('glucose', 95 + Math.sin(i) * 2);
      }

      // A value close to the mean should not be anomalous
      const result = processor.processReading('glucose', 96);
      expect(result.isAnomaly).toBe(false);
    });
  });

  describe('anomaly detection', () => {
    it('should flag extreme values as anomalies (z > 2.5)', () => {
      const processor = new BiomarkerStreamProcessor({
        zScoreThreshold: 2.5,
        windowSize: 50,
      });

      // Establish a stable baseline around 100
      for (let i = 0; i < 40; i++) {
        processor.processReading('cortisol', 100 + (i % 3) - 1);
      }

      // Inject an extreme spike
      const result = processor.processReading('cortisol', 500);
      expect(result.isAnomaly).toBe(true);
      expect(Math.abs(result.zScore)).toBeGreaterThan(2.5);
    });
  });

  describe('summary tracking', () => {
    it('should track total readings', () => {
      const processor = new BiomarkerStreamProcessor();

      processor.processReading('glucose', 95);
      processor.processReading('glucose', 97);
      processor.processReading('glucose', 96);

      const summary = processor.summary();
      expect(summary.totalReadings).toBe(3);
    });

    it('should compute anomaly rate', () => {
      const processor = new BiomarkerStreamProcessor({
        zScoreThreshold: 2.5,
        windowSize: 50,
      });

      // Feed normal readings
      for (let i = 0; i < 20; i++) {
        processor.processReading('glucose', 95);
      }

      const summary = processor.summary();
      expect(typeof summary.anomalyRate).toBe('number');
      expect(summary.anomalyRate).toBeGreaterThanOrEqual(0);
      expect(summary.anomalyRate).toBeLessThanOrEqual(1);
    });
  });

  describe('multiple biomarkers', () => {
    it('should track biomarkers independently', () => {
      const processor = new BiomarkerStreamProcessor({ windowSize: 50 });

      // Feed readings to two separate biomarkers
      for (let i = 0; i < 10; i++) {
        processor.processReading('glucose', 95 + i);
        processor.processReading('cortisol', 15 + i * 0.5);
      }

      const glucoseStats = processor.getStats('glucose');
      const cortisolStats = processor.getStats('cortisol');

      expect(glucoseStats).not.toBeNull();
      expect(cortisolStats).not.toBeNull();

      // They should have different means
      if (glucoseStats && cortisolStats) {
        expect(glucoseStats.mean).not.toBeCloseTo(cortisolStats.mean, 0);
        expect(glucoseStats.count).toBe(10);
        expect(cortisolStats.count).toBe(10);
      }
    });

    it('should return null stats for unknown biomarker', () => {
      const processor = new BiomarkerStreamProcessor();
      expect(processor.getStats('nonexistent')).toBeNull();
    });
  });

  describe('trend detection', () => {
    it('should return a numeric trend value', () => {
      const processor = new BiomarkerStreamProcessor({ windowSize: 50 });

      for (let i = 0; i < 20; i++) {
        processor.processReading('glucose', 90 + i);
      }

      const result = processor.processReading('glucose', 111);
      expect(typeof result.trend).toBe('number');
    });
  });
});
