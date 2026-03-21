import {
  MethylationSample,
  ProbeId,
  BetaValue,
  TissueType,
  ArrayType,
  SampleMetadata,
  QualityMetrics,
} from '../shared/types.js';
import {
  validateBetaValue,
  validateQualityMetrics,
  validateChronologicalAge,
  validateSex,
  ValidationError,
} from '../shared/validation.js';

export interface ParseOptions {
  sampleId: string;
  subjectId: string;
  tissueType: TissueType;
  arrayType: ArrayType;
  metadata: SampleMetadata;
  qcMetrics: QualityMetrics;
}

/**
 * Parses methylation beta-value data from CSV format into typed MethylationSample objects.
 *
 * Supports two CSV formats:
 * 1. Multi-sample: header row with probe IDs, data rows with beta values
 *    probeId,sample1,sample2,...
 *    cg00000029,0.45,0.67,...
 *
 * 2. Single-sample (pairs): rows of "probeId,betaValue"
 *    cg00000029,0.45
 *    cg00000108,0.87
 */
export class MethylationParser {
  /**
   * Parse a single-sample CSV where each row is a probeId,betaValue pair.
   */
  parseSingleSampleCsv(csv: string, options: ParseOptions): MethylationSample {
    this.validateOptions(options);

    const lines = csv.trim().split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      throw new ValidationError('CSV contains no data', 'csv', csv);
    }

    const cpgSites = new Map<ProbeId, BetaValue>();

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 2) {
        throw new ValidationError(
          `Invalid CSV row: expected "probeId,betaValue", got "${line}"`,
          'csv',
          line
        );
      }

      const probeId = parts[0].trim();
      const rawValue = parts[1].trim();
      const betaValue = Number(rawValue);

      validateBetaValue(betaValue, probeId);
      cpgSites.set(probeId, betaValue);
    }

    return {
      sampleId: options.sampleId,
      subjectId: options.subjectId,
      tissueType: options.tissueType,
      arrayType: options.arrayType,
      cpgSites,
      metadata: options.metadata,
      qcMetrics: options.qcMetrics,
    };
  }

  /**
   * Parse a multi-sample CSV where the first column is probeId and remaining
   * columns are sample beta values. The first row is a header with sample IDs.
   * Returns an array of MethylationSample, one per column after the probe ID column.
   */
  parseMultiSampleCsv(
    csv: string,
    optionsPerSample: ParseOptions[]
  ): MethylationSample[] {
    const lines = csv.trim().split('\n').filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new ValidationError(
        'Multi-sample CSV must have a header row and at least one data row',
        'csv',
        csv
      );
    }

    const headerParts = lines[0].split(',');
    const sampleCount = headerParts.length - 1;

    if (sampleCount < 1) {
      throw new ValidationError(
        'Header must have at least one sample column after probe ID column',
        'csv',
        lines[0]
      );
    }

    if (optionsPerSample.length !== sampleCount) {
      throw new ValidationError(
        `Options count (${optionsPerSample.length}) does not match sample columns (${sampleCount})`,
        'optionsPerSample',
        optionsPerSample.length
      );
    }

    for (const opts of optionsPerSample) {
      this.validateOptions(opts);
    }

    const cpgMaps: Map<ProbeId, BetaValue>[] = Array.from(
      { length: sampleCount },
      () => new Map()
    );

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const probeId = parts[0].trim();

      for (let s = 0; s < sampleCount; s++) {
        const rawValue = parts[s + 1]?.trim();
        if (rawValue === undefined || rawValue === '') {
          throw new ValidationError(
            `Missing beta value for probe ${probeId} in sample column ${s}`,
            probeId,
            rawValue
          );
        }
        const betaValue = Number(rawValue);
        validateBetaValue(betaValue, probeId);
        cpgMaps[s].set(probeId, betaValue);
      }
    }

    return optionsPerSample.map((opts, idx) => ({
      sampleId: opts.sampleId,
      subjectId: opts.subjectId,
      tissueType: opts.tissueType,
      arrayType: opts.arrayType,
      cpgSites: cpgMaps[idx],
      metadata: opts.metadata,
      qcMetrics: opts.qcMetrics,
    }));
  }

  private validateOptions(options: ParseOptions): void {
    validateChronologicalAge(options.metadata.chronologicalAge);
    validateSex(options.metadata.sex);
    validateQualityMetrics(options.qcMetrics);
  }
}
