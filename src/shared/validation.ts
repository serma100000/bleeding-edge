import { BetaValue, QualityMetrics } from './types.js';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateBetaValue(value: number, probeId: string): asserts value is BetaValue {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`Beta value must be a number`, probeId, value);
  }
  if (value < 0 || value > 1) {
    throw new ValidationError(`Beta value must be in [0, 1], got ${value}`, probeId, value);
  }
}

export function validateQualityMetrics(qc: QualityMetrics): void {
  const passRate = qc.probesPassedQC / qc.totalProbes;
  if (passRate < 0.95) {
    throw new ValidationError(
      `Probe pass rate ${(passRate * 100).toFixed(1)}% is below 95% threshold`,
      'probesPassedQC',
      passRate
    );
  }
  if (qc.bisulfiteConversion < 0.85) {
    throw new ValidationError(
      `Bisulfite conversion ${(qc.bisulfiteConversion * 100).toFixed(1)}% is below 85% threshold`,
      'bisulfiteConversion',
      qc.bisulfiteConversion
    );
  }
  if (qc.meanDetectionP > 0.01) {
    throw new ValidationError(
      `Mean detection p-value ${qc.meanDetectionP} exceeds 0.01 threshold`,
      'meanDetectionP',
      qc.meanDetectionP
    );
  }
}

export function validateChronologicalAge(age: number): void {
  if (typeof age !== 'number' || isNaN(age)) {
    throw new ValidationError('Chronological age must be a number', 'chronologicalAge', age);
  }
  if (age < 0 || age > 130) {
    throw new ValidationError(`Chronological age ${age} is out of valid range [0, 130]`, 'chronologicalAge', age);
  }
}

export function validateSex(sex: string): asserts sex is 'M' | 'F' {
  if (sex !== 'M' && sex !== 'F') {
    throw new ValidationError(`Sex must be 'M' or 'F', got '${sex}'`, 'sex', sex);
  }
}
