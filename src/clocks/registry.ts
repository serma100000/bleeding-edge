import type { ClockName } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';
import { AltumAgeClock } from './altumage.js';
import { GrimAgeClock } from './grimage.js';
import { DeepStrataAgeClock } from './deepstrataage.js';
import { EpInflammAgeClock } from './epinflamm.js';

export class ClockRegistry {
  private readonly clocks = new Map<ClockName, EpigeneticClock>();

  register(clock: EpigeneticClock): void {
    this.clocks.set(clock.name, clock);
  }

  getAll(): EpigeneticClock[] {
    return Array.from(this.clocks.values());
  }

  getByName(name: ClockName): EpigeneticClock | undefined {
    return this.clocks.get(name);
  }
}

export function getDefaultRegistry(): ClockRegistry {
  const registry = new ClockRegistry();
  registry.register(new AltumAgeClock());
  registry.register(new GrimAgeClock());
  registry.register(new DeepStrataAgeClock());
  registry.register(new EpInflammAgeClock());
  return registry;
}
