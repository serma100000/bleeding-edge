import { MethylationParser, ParseOptions } from '../../src/methylation/parser.js';
import { ValidationError } from '../../src/shared/validation.js';

function makeValidOptions(overrides?: Partial<ParseOptions>): ParseOptions {
  return {
    sampleId: 'S001',
    subjectId: 'SUB001',
    tissueType: 'whole_blood',
    arrayType: 'illumina_epic',
    metadata: {
      chronologicalAge: 45,
      sex: 'F',
      tissueSource: 'whole blood',
      collectionDate: '2025-01-15',
    },
    qcMetrics: {
      meanDetectionP: 0.005,
      probesPassedQC: 860000,
      totalProbes: 865000,
      bisulfiteConversion: 0.98,
    },
    ...overrides,
  };
}

describe('MethylationParser', () => {
  let parser: MethylationParser;

  beforeEach(() => {
    parser = new MethylationParser();
  });

  describe('parseSingleSampleCsv', () => {
    it('should parse valid CSV with correct beta values', () => {
      const csv = [
        'cg00000029,0.45',
        'cg00000108,0.87',
        'cg00000165,0.12',
      ].join('\n');

      const sample = parser.parseSingleSampleCsv(csv, makeValidOptions());

      expect(sample.sampleId).toBe('S001');
      expect(sample.subjectId).toBe('SUB001');
      expect(sample.tissueType).toBe('whole_blood');
      expect(sample.cpgSites.size).toBe(3);
      expect(sample.cpgSites.get('cg00000029')).toBeCloseTo(0.45);
      expect(sample.cpgSites.get('cg00000108')).toBeCloseTo(0.87);
      expect(sample.cpgSites.get('cg00000165')).toBeCloseTo(0.12);
    });

    it('should parse a single probe', () => {
      const csv = 'cg00000029,0.5';
      const sample = parser.parseSingleSampleCsv(csv, makeValidOptions());
      expect(sample.cpgSites.size).toBe(1);
      expect(sample.cpgSites.get('cg00000029')).toBeCloseTo(0.5);
    });

    it('should parse beta values at boundaries (0 and 1)', () => {
      const csv = 'cg00000001,0\ncg00000002,1';
      const sample = parser.parseSingleSampleCsv(csv, makeValidOptions());
      expect(sample.cpgSites.get('cg00000001')).toBe(0);
      expect(sample.cpgSites.get('cg00000002')).toBe(1);
    });

    it('should reject beta value greater than 1', () => {
      const csv = 'cg00000029,1.5';
      expect(() => parser.parseSingleSampleCsv(csv, makeValidOptions())).toThrow(
        ValidationError
      );
    });

    it('should reject beta value less than 0', () => {
      const csv = 'cg00000029,-0.1';
      expect(() => parser.parseSingleSampleCsv(csv, makeValidOptions())).toThrow(
        ValidationError
      );
    });

    it('should reject NaN beta values', () => {
      const csv = 'cg00000029,NaN';
      expect(() => parser.parseSingleSampleCsv(csv, makeValidOptions())).toThrow(
        ValidationError
      );
    });

    it('should reject non-numeric beta values', () => {
      const csv = 'cg00000029,abc';
      expect(() => parser.parseSingleSampleCsv(csv, makeValidOptions())).toThrow(
        ValidationError
      );
    });

    it('should reject empty CSV', () => {
      expect(() => parser.parseSingleSampleCsv('', makeValidOptions())).toThrow(
        ValidationError
      );
    });

    it('should reject whitespace-only CSV', () => {
      expect(() =>
        parser.parseSingleSampleCsv('   \n  \n  ', makeValidOptions())
      ).toThrow(ValidationError);
    });

    it('should reject samples failing QC probe pass rate threshold (<95%)', () => {
      const csv = 'cg00000029,0.5';
      const opts = makeValidOptions({
        qcMetrics: {
          meanDetectionP: 0.005,
          probesPassedQC: 800000,
          totalProbes: 865000, // ~92.5%
          bisulfiteConversion: 0.98,
        },
      });
      expect(() => parser.parseSingleSampleCsv(csv, opts)).toThrow(ValidationError);
    });

    it('should reject samples failing bisulfite conversion threshold (<85%)', () => {
      const csv = 'cg00000029,0.5';
      const opts = makeValidOptions({
        qcMetrics: {
          meanDetectionP: 0.005,
          probesPassedQC: 860000,
          totalProbes: 865000,
          bisulfiteConversion: 0.80,
        },
      });
      expect(() => parser.parseSingleSampleCsv(csv, opts)).toThrow(ValidationError);
    });

    it('should reject samples with high mean detection p-value (>0.01)', () => {
      const csv = 'cg00000029,0.5';
      const opts = makeValidOptions({
        qcMetrics: {
          meanDetectionP: 0.05,
          probesPassedQC: 860000,
          totalProbes: 865000,
          bisulfiteConversion: 0.98,
        },
      });
      expect(() => parser.parseSingleSampleCsv(csv, opts)).toThrow(ValidationError);
    });

    it('should reject missing chronological age (NaN)', () => {
      const csv = 'cg00000029,0.5';
      const opts = makeValidOptions();
      opts.metadata.chronologicalAge = NaN;
      expect(() => parser.parseSingleSampleCsv(csv, opts)).toThrow(ValidationError);
    });

    it('should reject invalid sex value', () => {
      const csv = 'cg00000029,0.5';
      const opts = makeValidOptions();
      (opts.metadata as any).sex = 'X';
      expect(() => parser.parseSingleSampleCsv(csv, opts)).toThrow(ValidationError);
    });

    it('should handle lines with extra whitespace', () => {
      const csv = '  cg00000029 , 0.45 \n cg00000108 , 0.87 ';
      const sample = parser.parseSingleSampleCsv(csv, makeValidOptions());
      expect(sample.cpgSites.size).toBe(2);
      expect(sample.cpgSites.get('cg00000029')).toBeCloseTo(0.45);
    });
  });

  describe('parseMultiSampleCsv', () => {
    it('should parse multi-sample CSV correctly', () => {
      const csv = [
        'probeId,sample1,sample2',
        'cg00000029,0.45,0.67',
        'cg00000108,0.87,0.23',
      ].join('\n');

      const opts1 = makeValidOptions({ sampleId: 'S001' });
      const opts2 = makeValidOptions({ sampleId: 'S002' });

      const samples = parser.parseMultiSampleCsv(csv, [opts1, opts2]);

      expect(samples).toHaveLength(2);
      expect(samples[0].sampleId).toBe('S001');
      expect(samples[0].cpgSites.get('cg00000029')).toBeCloseTo(0.45);
      expect(samples[1].sampleId).toBe('S002');
      expect(samples[1].cpgSites.get('cg00000029')).toBeCloseTo(0.67);
    });

    it('should reject when options count mismatches sample columns', () => {
      const csv = 'probeId,sample1,sample2\ncg00000029,0.45,0.67';
      const opts1 = makeValidOptions({ sampleId: 'S001' });

      expect(() => parser.parseMultiSampleCsv(csv, [opts1])).toThrow(
        ValidationError
      );
    });

    it('should reject CSV with only a header row', () => {
      const csv = 'probeId,sample1';
      expect(() =>
        parser.parseMultiSampleCsv(csv, [makeValidOptions()])
      ).toThrow(ValidationError);
    });
  });
});
