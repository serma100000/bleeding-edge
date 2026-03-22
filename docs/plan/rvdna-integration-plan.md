# rvDNA Integration Plan for CHRONOS

**Date:** 2026-03-21
**Status:** Draft
**Package:** `@ruvector/rvdna` v0.3.0

---

## 1. Executive Summary

This plan replaces four homegrown subsystems in CHRONOS with native capabilities from `@ruvector/rvdna`:

| Current Component | Replacement | Benefit |
|---|---|---|
| `MethylationParser` (CSV) | rvDNA `fastaToRvdna` + `readRvdna` | Native 2-bit encoding, structured .rvdna format |
| `CpGEmbedder` (random projection) | rvDNA k-mer vector blocks | Pre-computed HNSW-ready embeddings, no separate step |
| JSONL/RVF persistence | `.rvdna` file storage (Section 5) | Single-file with methylation + clock data + AI features |
| Simulated AltumAge clock | rvDNA Horvath clock (Rust) | 600-9000x faster, real Horvath coefficients |

Additionally, two new features become possible:
- **Pharmacogenomics** (CYP2D6/CYP2C19) integrated into intervention recommendations
- **WASM browser deployment** for client-side methylation analysis

---

## 2. Architecture Changes

### 2.1 Current Architecture

```
CSV input --> MethylationParser --> MethylationSample (Map<ProbeId, BetaValue>)
    |
    v
CpGEmbedder (random projection, 25000 -> 256 dim)
    |
    v
RuVectorStore (JSONL fallback / @ruvector/rvf native)
    |
    v
4 simulated clocks --> ClockConsensus --> ZK proof --> Recommendations
```

### 2.2 Target Architecture

```
Input (CSV / FASTA / .rvdna) --> RvdnaIngestService
    |
    +--> fastaToRvdna() --> .rvdna file (Section 0: sequence, Section 1: k-mer vectors)
    |
    v
readRvdna() --> RvdnaFile
    |
    +--> .kmerVectors[] (HNSW-ready, no CpGEmbedder needed)
    +--> .sequence (2-bit packed)
    +--> .metadata (Section 6)
    |
    v
Horvath clock (rvDNA Rust) + existing simulated clocks --> ClockConsensus
    |
    v
cosineSimilarity() for profile matching (replaces JS fallback)
    |
    v
Pharmacogenomics (CYP2D6/CYP2C19) --> Enhanced Recommendations
```

### 2.3 Key Design Decisions

- **Dual-mode ingestion**: Accept both legacy CSV and native .rvdna input. CSV input gets converted to .rvdna on ingest.
- **Graceful fallback**: All rvDNA native features check `isNativeAvailable()`. When native bindings are absent (CI, unsupported platforms), fall back to existing JS implementations.
- **Embedding dimension change**: rvDNA k-mer vectors use configurable dimensions (default 512). The pipeline must accommodate this vs the current fixed 256.
- **Backward-compatible API**: The `/api/submit` endpoint continues accepting CSV. A new `/api/submit/rvdna` endpoint accepts .rvdna binary uploads.

---

## 3. File-by-File Changes

### 3.1 New Files

| File | Purpose |
|---|---|
| `src/methylation/rvdna-adapter.ts` | Adapter between rvDNA types and CHRONOS MethylationSample. Wraps `fastaToRvdna`, `readRvdna`, `encode2bit`, `decode2bit`. Converts CSV beta values into synthetic FASTA for rvDNA encoding. |
| `src/methylation/rvdna-store.ts` | .rvdna file-based storage manager. Stores one .rvdna file per sample in `data/samples/`. Handles Section 5 (epigenomic tracks) for methylation + clock data persistence. |
| `src/clocks/horvath.ts` | Wrapper around rvDNA's native Horvath clock. Implements `EpigeneticClock` interface. Falls back to existing AltumAge when native unavailable. |
| `src/pharmacogenomics/pgx-engine.ts` | Pharmacogenomics engine wrapping rvDNA's `callCyp2d6`, `callCyp2c19`, `determineApoe`, `computeRiskScores`. |
| `src/pharmacogenomics/pgx-recommender.ts` | Maps CYP diplotype phenotypes to drug-specific intervention recommendations. Integrates with existing `InterventionRecommender`. |

### 3.2 Modified Files

#### `src/methylation/parser.ts`

- **No deletion.** Keep as-is for backward compatibility.
- Add a new method `parseToRvdna(csv, options): Buffer` that converts parsed CSV data into a synthetic sequence and calls `fastaToRvdna()`.
- The class becomes the legacy path; new code should use `rvdna-adapter.ts`.

#### `src/methylation/embedder.ts`

- **No deletion.** Keep as fallback.
- Add a static method `fromKmerVectors(kmerVectors: RvdnaFile['kmerVectors']): Float32Array` that concatenates/averages rvDNA k-mer vector blocks into a single embedding vector.
- When rvDNA k-mer vectors are available, skip the random projection entirely.

#### `src/shared/ruvector-client.ts`

- **`ChronosRuVectorService`**: Add a new `rvdnaStore` property of type `RvdnaStore` (from `rvdna-store.ts`).
- Add methods:
  - `storeSampleRvdna(sampleId: string, rvdnaBuffer: Buffer, metadata: Record<string, unknown>): Promise<void>`
  - `loadSampleRvdna(sampleId: string): Promise<RvdnaFile | null>`
  - `queryBySimilarity(kmerVector: Float32Array, k: number): Promise<RvfQueryResult[]>` -- uses `cosineSimilarity` from rvDNA
- The existing `methylationStore` (RVF-based) remains for vector search; the new `rvdnaStore` handles full sample persistence.
- Replace the `cosineSimilarity` utility function at line 493 with a call to `rvDNA.cosineSimilarity` (native Rust speed when available).

#### `src/orchestration/pipeline.ts`

- Add an optional `rvdnaAdapter` dependency to `PipelineDependencies`.
- In `runPipeline`:
  - **Stage 1 (ingesting)**: If input is an RvdnaFile, skip CSV parsing. If input is CSV, convert to .rvdna via adapter.
  - **Stage 2 (embedding)**: If `.kmerVectors` are present on the RvdnaFile, use them directly instead of calling `embedder.embed()`. Extract a unified embedding from the k-mer vector blocks.
  - **Stage 3 (inferring)**: Add Horvath clock to the clock array when native rvDNA is available.
  - **Stage 6 (indexing)**: Persist the .rvdna file alongside the vector store entry.
- Add new **Stage 7.5 (pharmacogenomics)**: If genotype data is available, run CYP2D6/CYP2C19/APOE analysis and feed results into the recommender.

#### `src/orchestration/factory.ts`

- Import and wire up `RvdnaAdapter`, `RvdnaStore`, `HorvathClock`, `PgxEngine`.
- Add `HorvathClock` to the clock registry (conditional on `isNativeAvailable()`).
- Pass `rvdnaAdapter` into the pipeline dependencies.
- Initialize `RvdnaStore` with `data/samples/` path.

#### `src/server.ts`

- Add `POST /api/submit/rvdna` endpoint for binary .rvdna uploads.
- Add `GET /api/pgx/:subjectId` endpoint for pharmacogenomics results.
- Add `GET /api/sample/:sampleId/rvdna` endpoint to download raw .rvdna file.
- Modify the ingest pipeline (`runInlineIngest`) to produce .rvdna files per sample instead of just vector embeddings.
- In the health endpoint, report rvDNA native availability and sample store count.

#### `src/shared/types.ts`

- Add new types:
  - `HorvathClockResult` extending `ClockResult` with Horvath-specific fields.
  - `PgxProfile` with `cyp2d6`, `cyp2c19`, `apoe`, `biomarkerProfile` fields.
  - `RvdnaSampleRef` with `sampleId`, `filePath`, `sequenceLength`, `kmerDimensions`.
  - Add `'horvath'` to the `ClockName` union type.
- Add `pgxProfile?: PgxProfile` to `PipelineRun`.

### 3.3 Files NOT Changed

| File | Reason |
|---|---|
| `src/clocks/altumage.ts` | Kept as simulated clock; Horvath supplements, does not replace |
| `src/clocks/grimage.ts` | Unaffected |
| `src/clocks/deepstrataage.ts` | Unaffected |
| `src/clocks/epinflamm.ts` | Unaffected |
| `src/clocks/consensus.ts` | Already handles variable numbers of clocks; weight for Horvath added via config |
| `src/proofs/*` | ZK proof generation unchanged |
| `src/knowledge/knowledge-graph.ts` | Unchanged; receives same inputs |
| `src/knowledge/recommender.ts` | Extended (not modified) by PgxRecommender |
| `src/knowledge/temporal-tracker.ts` | Unchanged |

---

## 4. New Features Enabled

### 4.1 Native Horvath Clock

The Rust crate behind rvDNA includes a full Horvath multi-tissue clock implementation. Integration:

- Implements `EpigeneticClock` interface with `predict(cpgSites, chronologicalAge)`
- Uses the 353 Horvath CpG sites with published coefficients
- Returns real biological age estimates (not simulated)
- Performance: 0.1-0.5 seconds vs 5-15 minutes in R/Bioconductor (600-9000x speedup per rvDNA benchmarks)
- Falls back to existing simulated AltumAge when native bindings unavailable

### 4.2 Pharmacogenomics

New bounded context for drug metabolism prediction:

- **CYP2D6**: 6 defining variants, diplotype calling, activity score, phenotype classification (Ultra-Rapid / Normal / Intermediate / Poor)
- **CYP2C19**: 3 defining variants, same classification scheme
- **APOE**: Alzheimer's risk stratification from rs429358 + rs7412
- **20-SNP biomarker risk scoring**: Cancer, Cardiovascular, Neurological, Metabolism categories with gene-gene interactions
- **64-dim profile vectors**: Pre-computed, L2-normalized, ready for HNSW similarity search

Integration points:
- Feed CYP phenotype into `InterventionRecommender` to flag drug interactions
- Add APOE genotype to aging risk profile in knowledge graph
- Use biomarker risk scores as covariates in consensus age computation

### 4.3 .rvdna Format Benefits

Each sample stored as a single `.rvdna` file containing:

| Section | Content | Current Equivalent |
|---|---|---|
| Section 0 | 2-bit packed DNA sequence | Not stored (only beta values) |
| Section 1 | K-mer vector blocks (HNSW-ready) | `CpGEmbedder` output + JSONL |
| Section 2 | Attention weights (sparse COO) | Not available |
| Section 3 | Variant tensor (f16 likelihoods) | Not available |
| Section 4 | Protein embeddings + GNN features | Not available |
| Section 5 | Methylation + clock data | Scattered across JSONL files |
| Section 6 | JSON metadata + checksums | JSONL sidecar |

Key advantages:
- Single file per sample (no sidecar files)
- mmap random access (<1 us vs scan-from-start)
- Pre-computed AI features (no re-encoding on load)
- Built-in checksums for integrity

### 4.4 Streaming Biomarker Monitoring

rvDNA includes a `StreamProcessor` with ring buffers, CUSUM changepoint detection, z-score anomaly detection, and trend analysis. This can power a real-time biomarker monitoring dashboard:

- Track 6+ biomarkers per subject over time
- Detect anomalous readings with statistical rigor
- Compute EMA trends and changepoint alerts
- Feed anomaly events into the temporal tracker

---

## 5. Migration Path

### 5.1 Preserving Existing 656 Seeded Samples

The 656 GSE40279 samples currently stored in `data/methylation-embeddings.rvf` (or `.jsonl` fallback) must be migrated.

**Strategy: Lazy migration with dual-read**

1. On startup, check for `data/samples/` directory. If empty, mark migration as pending.
2. Existing JSONL/RVF data remains readable through `RuVectorStore` (no data loss).
3. When a sample is queried, check `data/samples/{sampleId}.rvdna` first. If not found, fall back to JSONL.
4. Provide a one-time migration endpoint `POST /api/admin/migrate-to-rvdna` that:
   a. Reads each entry from the JSONL/RVF store
   b. Reconstructs a synthetic .rvdna file from the stored embedding + metadata
   c. Writes to `data/samples/{sampleId}.rvdna`
   d. Preserves the original vector in the RVF store for backward compatibility
5. Full migration requires re-downloading and re-processing the GEO matrix to get raw beta values (the current store only has 256-dim embeddings, not original probe data). This is a Sprint 3 task.

**Limitation**: The current 656 samples only have embeddings + metadata, not raw CpG beta values. Full .rvdna conversion requires re-ingesting from source. The migration endpoint creates "lite" .rvdna files with k-mer vectors synthesized from the existing 256-dim embeddings (Section 1 only, no Section 0 sequence data).

### 5.2 Backward Compatibility

| Feature | Legacy Path | New Path |
|---|---|---|
| CSV submission | `MethylationParser.parseSingleSampleCsv()` | Same, then convert to .rvdna |
| Embedding | `CpGEmbedder.embed()` | `readRvdna().kmerVectors` |
| Vector search | `RuVectorStore.query()` | Same store, rvDNA cosine similarity |
| Persistence | `.jsonl` / `.rvf` files | `.rvdna` files + existing stores |
| Clock inference | 4 simulated clocks | 4 simulated + 1 real Horvath |

No existing API contracts change. New endpoints are additive.

---

## 6. Risk Assessment

### 6.1 High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Native binding unavailability** | `fastaToRvdna` and `readRvdna` require native Rust NAPI-RS bindings. If the platform package (`@ruvector/rvdna-win32-x64-msvc`) fails to install or load, core features are blocked. | Every native call is gated behind `isNativeAvailable()`. Fallback to existing JS path is always available. Feature flags control which path is active. |
| **Embedding dimension mismatch** | rvDNA k-mer vectors default to 512 dimensions; current pipeline assumes 256. All downstream consumers (RVF store, consensus, recommender, temporal tracker) expect 256-dim vectors. | Configure rvDNA with `dims: 256` to match, or add a dimensionality adapter layer. The `fastaToRvdna` options support configurable `dims`. |
| **Section 5 format maturity** | The .rvdna README marks Section 5 (Epigenomic Tracks) in the format layout but the current JS API only exposes Sections 0, 1, 3, 6. Section 5 read/write may not be fully implemented in v0.3.0. | Verify Section 5 support before Sprint 2. If unavailable, store methylation + clock data in Section 6 (metadata JSON) as a stopgap. |

### 6.2 Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Beta-value to FASTA mapping** | CpG methylation beta values (0-1 floats) are not DNA sequences. Converting them to FASTA for `fastaToRvdna` is semantically incorrect. The 2-bit encoding is designed for ACGT bases, not methylation levels. | Use .rvdna Sections 5 and 6 for methylation data. Section 0 (sequence) stores the actual CpG island DNA context sequences, not beta values. The k-mer vectors (Section 1) are computed from the DNA context, not from methylation levels. Methylation levels go in Section 5. |
| **Horvath clock coefficient accuracy** | The rvDNA Rust crate implements Horvath's algorithm, but coefficient accuracy depends on the training data embedded in the crate. If coefficients differ from the canonical 2013 publication, age predictions will diverge. | Validate against known Horvath reference samples. Compare rvDNA Horvath output with the R `methylclock` package on the same input. Add this to Sprint 1 as a gating test. |
| **WASM binary size** | Target is <2 MB gzipped, but full methylation analysis with Horvath coefficients may exceed this. | Profile WASM build size. If too large, split into core (encode/decode/cosine) and extended (Horvath/PGx) modules. |

### 6.3 Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Storage increase** | .rvdna files are larger than JSONL entries (they include pre-computed vectors, attention weights, etc.) | .rvdna uses 2-bit packing (3.2 bits/base) which is more efficient than raw storage. For 656 samples, estimate ~50-100 MB total vs current ~15 MB JSONL. Acceptable. |
| **CYP diplotype accuracy** | Genotyping array data has limited resolution for CYP2D6 (no CNV, no phase). | rvDNA already includes confidence scoring and notes array warning about limitations. Surface these in the UI. |

---

## 7. Sprint Breakdown

### Sprint 1: Foundation (1 week)

**Goal**: rvDNA dependency installed, native availability verified, Horvath clock integrated.

Tasks:
1. Add `@ruvector/rvdna` to `package.json` dependencies
2. Create `src/methylation/rvdna-adapter.ts` with `isNativeAvailable()` check and `cosineSimilarity` wrapper
3. Create `src/clocks/horvath.ts` implementing `EpigeneticClock` interface
4. Add `'horvath'` to `ClockName` type union in `src/shared/types.ts`
5. Register Horvath clock in `src/orchestration/factory.ts` (conditional on native)
6. Validate Horvath output against reference data (gating test)
7. Update health endpoint to report rvDNA native status
8. Write tests for adapter and Horvath clock (mock-first, London School)

**Deliverable**: Horvath clock running in pipeline alongside existing 4 clocks. No persistence changes yet.

### Sprint 2: Storage + Embedding (1 week)

**Goal**: Replace JSONL persistence with .rvdna files. Use k-mer vectors instead of random projection.

Tasks:
1. Create `src/methylation/rvdna-store.ts` for .rvdna file management
2. Add `CpGEmbedder.fromKmerVectors()` static method
3. Modify pipeline Stage 2 to use k-mer vectors when available
4. Modify pipeline Stage 6 to persist .rvdna files
5. Update `ChronosRuVectorService` with rvdna store methods
6. Replace JS `cosineSimilarity` with rvDNA's native version
7. Add `POST /api/submit/rvdna` endpoint to server
8. Add `GET /api/sample/:sampleId/rvdna` download endpoint
9. Write tests for store and embedding paths

**Deliverable**: New samples stored as .rvdna files. Existing samples still readable from JSONL. k-mer embeddings used when native available.

### Sprint 3: Migration + Pharmacogenomics (1 week)

**Goal**: Migrate existing data. Add PGx features.

Tasks:
1. Build `POST /api/admin/migrate-to-rvdna` migration endpoint
2. Create `src/pharmacogenomics/pgx-engine.ts` wrapping rvDNA CYP/APOE/biomarker APIs
3. Create `src/pharmacogenomics/pgx-recommender.ts` mapping phenotypes to drug recommendations
4. Add PGx types to `src/shared/types.ts`
5. Add PGx stage to pipeline (Stage 7.5)
6. Add `GET /api/pgx/:subjectId` endpoint
7. Modify ingest pipeline to optionally accept 23andMe genotype data alongside methylation
8. Wire PGx into factory
9. Write tests for PGx engine and recommender

**Deliverable**: Pharmacogenomics pipeline working end-to-end. Migration endpoint available.

### Sprint 4: WASM + Polish (1 week)

**Goal**: Browser-side rvDNA capabilities. Production hardening.

Tasks:
1. Evaluate WASM build of rvDNA (`wasm-pack build --target bundler`)
2. Determine which features run client-side vs server-side:
   - Client: `encode2bit`, `decode2bit`, `translateDna`, `cosineSimilarity` (available now)
   - Client (planned): `.rvdna` read, HNSW search
   - Server only: `fastaToRvdna`, Horvath clock, full PGx pipeline
3. Add WASM loading to React UI for client-side preview
4. Add streaming biomarker monitoring integration (`StreamProcessor`)
5. Performance benchmarking: compare old vs new pipeline latency
6. Error handling audit: ensure all native calls have JS fallbacks
7. Documentation of new API endpoints and PGx features
8. End-to-end integration tests with real GEO data

**Deliverable**: WASM-enabled browser preview. Full test coverage. Production-ready.

---

## 8. Dependency Summary

```
@ruvector/rvdna@^0.3.0
  - @ruvector/rvdna-win32-x64-msvc@0.1.0 (optional, native)
  - @ruvector/rvdna-linux-x64-gnu@0.1.0 (optional, native)
  - @ruvector/rvdna-darwin-arm64@0.1.0 (optional, native)
```

The package is already present in the monorepo at `RuVector/npm/packages/rvdna/`. For development, use a local file reference:

```json
{
  "dependencies": {
    "@ruvector/rvdna": "file:./RuVector/npm/packages/rvdna"
  }
}
```

For production, publish to npm and reference `@ruvector/rvdna@^0.3.0`.

---

## 9. Success Criteria

| Metric | Current | Target |
|---|---|---|
| Clock count | 4 (simulated) | 5 (4 simulated + 1 real Horvath) |
| Methylation age computation | Simulated (instant, fake) | Real Horvath (<0.5s, validated) |
| Embedding method | Random projection (JS) | K-mer vectors (native Rust) |
| Sample persistence | JSONL + metadata sidecar | Single .rvdna file per sample |
| Similarity search | JS brute-force cosine | Native Rust cosine |
| Pharmacogenomics | Not available | CYP2D6/CYP2C19/APOE + 20-SNP risk |
| Browser capability | None | 2-bit encode/decode, protein translation, cosine similarity |
| API backward compat | N/A | 100% -- all existing endpoints unchanged |
