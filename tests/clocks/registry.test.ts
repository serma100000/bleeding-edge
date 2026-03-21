import { ClockRegistry, getDefaultRegistry } from '../../src/clocks/registry.js';
import type { EpigeneticClock } from '../../src/clocks/clock-interface.js';
import type { ClockName, ClockResult } from '../../src/shared/types.js';

function makeMockClock(name: ClockName, mae: number): EpigeneticClock {
  return {
    name,
    mae,
    predict: (_cpg: Map<string, number>, chronologicalAge: number): ClockResult => ({
      clockName: name,
      biologicalAge: chronologicalAge,
      chronologicalAge,
      ageAcceleration: 0,
      confidence: 0.9,
      topContributingCpGs: [],
      modelHash: `hash-${name}`,
      inferenceTimeMs: 1.0,
    }),
    getModelHash: () => `hash-${name}`,
  };
}

describe('ClockRegistry', () => {
  describe('register and retrieve', () => {
    it('should register a clock and retrieve it by name', () => {
      const registry = new ClockRegistry();
      const clock = makeMockClock('altumage', 2.5);

      registry.register(clock);

      expect(registry.getByName('altumage')).toBe(clock);
    });

    it('should return undefined for unregistered clock name', () => {
      const registry = new ClockRegistry();

      expect(registry.getByName('altumage')).toBeUndefined();
    });

    it('should return all registered clocks via getAll()', () => {
      const registry = new ClockRegistry();
      const clock1 = makeMockClock('altumage', 2.5);
      const clock2 = makeMockClock('grimage', 3.5);

      registry.register(clock1);
      registry.register(clock2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(clock1);
      expect(all).toContain(clock2);
    });

    it('should replace a clock if re-registered with same name', () => {
      const registry = new ClockRegistry();
      const clock1 = makeMockClock('altumage', 2.5);
      const clock2 = makeMockClock('altumage', 3.0);

      registry.register(clock1);
      registry.register(clock2);

      expect(registry.getByName('altumage')).toBe(clock2);
      expect(registry.getAll()).toHaveLength(1);
    });

    it('should return empty array when no clocks registered', () => {
      const registry = new ClockRegistry();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getDefaultRegistry', () => {
    it('should create a registry with all 4 clocks', () => {
      const registry = getDefaultRegistry();
      const all = registry.getAll();

      expect(all).toHaveLength(4);
    });

    it('should contain altumage clock', () => {
      const registry = getDefaultRegistry();
      const clock = registry.getByName('altumage');

      expect(clock).toBeDefined();
      expect(clock!.name).toBe('altumage');
      expect(clock!.mae).toBe(2.5);
    });

    it('should contain grimage clock', () => {
      const registry = getDefaultRegistry();
      const clock = registry.getByName('grimage');

      expect(clock).toBeDefined();
      expect(clock!.name).toBe('grimage');
      expect(clock!.mae).toBe(3.5);
    });

    it('should contain deepstrataage clock', () => {
      const registry = getDefaultRegistry();
      const clock = registry.getByName('deepstrataage');

      expect(clock).toBeDefined();
      expect(clock!.name).toBe('deepstrataage');
      expect(clock!.mae).toBe(1.89);
    });

    it('should contain epinflamm clock', () => {
      const registry = getDefaultRegistry();
      const clock = registry.getByName('epinflamm');

      expect(clock).toBeDefined();
      expect(clock!.name).toBe('epinflamm');
      expect(clock!.mae).toBe(7.0);
    });

    it('should return clocks with valid model hashes', () => {
      const registry = getDefaultRegistry();
      const all = registry.getAll();

      for (const clock of all) {
        const hash = clock.getModelHash();
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('should return clocks that produce deterministic hashes', () => {
      const registry = getDefaultRegistry();
      const all = registry.getAll();

      for (const clock of all) {
        const hash1 = clock.getModelHash();
        const hash2 = clock.getModelHash();
        expect(hash1).toBe(hash2);
      }
    });
  });
});
