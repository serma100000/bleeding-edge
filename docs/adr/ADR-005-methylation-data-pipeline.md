# ADR-005: Methylation Data Ingestion Pipeline

**Status:** Accepted
**Date:** 2026-03-21
**Context:** CHRONOS Data Layer

## Context

CHRONOS must ingest DNA methylation data from Illumina arrays (450K and EPIC platforms). Raw data comes as .idat files or preprocessed beta-value CSVs. Cross-platform harmonization is required since clocks are trained on different array versions.

## Decision

Implement a **two-stage ingestion pipeline** with strict validation at the system boundary.

### Stage 1: Parsing & QC

**Input formats supported:**
- Illumina .idat files (raw)
- Beta-value CSV (preprocessed)
- GEO Series Matrix files

**Quality control:**
1. Probe detection p-value filtering (p > 0.01 removed)
2. Sex chromosome probe removal
3. Cross-reactive probe removal (Chen et al. list)
4. SNP probe filtering
5. Sample-level QC: mean detection p-value, bisulfite conversion efficiency

**Normalization:**
- Single-sample noob (ssNoob) normalization for cross-platform compatibility [Fortin et al., 2017]
- This method works on individual samples without requiring a reference panel

### Stage 2: Harmonization & Output

**Cross-platform harmonization:**
- 450K (485,512 probes) and EPIC (866,836 probes) share ~452,000 common probes
- Subset to common probes when mixing platforms
- Platform-specific clocks (DeepStrataAge: EPIC-only, 12,234 CpGs) get full probe set

**Output:** `MethylationSample` typed interface:

```typescript
interface MethylationSample {
  sampleId: string;
  subjectId: string;
  tissueType: TissueType;
  arrayType: 'illumina_450k' | 'illumina_epic' | 'illumina_epic_v2';
  cpgSites: Map<string, number>;  // probe ID -> beta value [0, 1]
  metadata: {
    chronologicalAge: number;
    sex: 'M' | 'F';
    tissueSource: string;
    collectionDate: string;
    batchId?: string;
  };
  qcMetrics: {
    meanDetectionP: number;
    probesPassedQC: number;
    totalProbes: number;
    bisulfiteConversion: number;
  };
}
```

### Validation Rules (System Boundary)

- Beta values must be in [0, 1]
- At least 95% of probes must pass detection p-value threshold
- Bisulfite conversion efficiency must exceed 85%
- Chronological age must be provided (needed for age acceleration calculation)
- Array type must be explicitly declared

## Alternatives Considered

1. **Python subprocess calling minfi/sesame** — Works but adds Python dependency; slower; harder to integrate with TypeScript pipeline
2. **Direct .idat parsing in TypeScript** — Complex binary format; existing R/Python parsers are battle-tested
3. **Only accept preprocessed CSVs** — Limits usability; most labs work with raw .idat

## Decision: Hybrid Approach

- Accept preprocessed beta-value CSVs natively in TypeScript
- For raw .idat files, shell out to a Python subprocess using `sesame` or `methylprep`
- Long-term: implement native .idat parser in Rust (RuVector crate)

## Consequences

- **Positive:** Supports all common input formats; strict QC catches bad data early; cross-platform harmonization is transparent
- **Negative:** Python dependency for .idat parsing; ssNoob normalization may not be optimal for all study designs
