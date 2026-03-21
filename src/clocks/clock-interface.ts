import type { ClockName, ClockResult } from '../shared/types.js';

export interface EpigeneticClock {
  readonly name: ClockName;
  readonly mae: number;
  predict(cpgSites: Map<string, number>, chronologicalAge: number): ClockResult;
  getModelHash(): string;
}
