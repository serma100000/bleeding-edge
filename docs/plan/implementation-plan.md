# CHRONOS Implementation Plan

**Project:** Cryptographically Honest, Reproducible, Orchestrated Network for Omics-based Senescence
**Date:** 2026-03-21
**Research Doc:** [docs/research/chronos-verifiable-epigenetic-aging.md](../research/chronos-verifiable-epigenetic-aging.md)

---

## Sprint Overview

| Sprint | Focus | Duration | Key Deliverable |
|--------|-------|----------|----------------|
| 1 | Foundation & Data Pipeline | 2 weeks | Methylation ingestion + RuVector embeddings working |
| 2 | Clock Agents | 2 weeks | 4 clocks running in parallel via ruflo swarm |
| 3 | Consensus Engine | 1 week | Raft-based weighted consensus producing stable results |
| 4 | ZK Proof Pipeline | 3 weeks | EZKL compiling clocks, generating + verifying proofs |
| 5 | Knowledge Graph & Recommendations | 2 weeks | CpG pathway graph + intervention recommender |
| 6 | Integration & API | 2 weeks | End-to-end pipeline + external API |

---

## Sprint 1: Foundation & Data Pipeline (Weeks 1-2)

### Goal
Ingest methylation data, validate it, and store CpG embeddings in RuVector.

### Tasks

#### 1.1 Project Scaffolding
- [ ] Create directory structure per DDD bounded contexts:
  ```
  src/
    methylation/    # Bounded Context 1
    clocks/         # Bounded Context 2
    proofs/         # Bounded Context 3
    knowledge/      # Bounded Context 4
    orchestration/  # Bounded Context 5
  ```
- [ ] Set up TypeScript config, ESLint, test framework
- [ ] Wire RuVector MCP server (already in `.mcp.json`)
- [ ] Wire ruflo MCP server (already in `.mcp.json`)

#### 1.2 Methylation Parser
- [ ] Implement `MethylationParser` for beta-value CSV ingestion
- [ ] Implement input validation (beta values in [0,1], probe count thresholds, bisulfite conversion check)
- [ ] Define `MethylationSample` TypeScript interface per DDD spec
- [ ] Write unit tests with synthetic methylation data

#### 1.3 CpG Embedding Generation
- [ ] Implement `CpGEmbedder` using RuVector's `embeddings_generate`
- [ ] Train autoencoder on public GEO dataset (GSE40279 — 656 whole blood samples, ages 19-101)
- [ ] Target: d=256 embeddings from ~450K CpG sites
- [ ] Validate embeddings retain age-predictive information (auxiliary loss)

#### 1.4 RuVector Integration
- [ ] Create RVF store for methylation embeddings via `rvf_create`
- [ ] Ingest test embeddings via `rvf_ingest`
- [ ] Benchmark HNSW search: query time, recall@10, memory usage
- [ ] Tune HNSW params (M=16, efConstruction=200) based on benchmarks

### Exit Criteria
- [ ] Can parse a beta-value CSV into a typed `MethylationSample`
- [ ] Can generate d=256 embedding and store in RuVector
- [ ] HNSW kNN query returns results in <1ms for 10K test vectors

### ADRs Referenced
- [ADR-003: Vector Knowledge Graph](../adr/ADR-003-vector-knowledge-graph.md)
- [ADR-005: Methylation Data Pipeline](../adr/ADR-005-methylation-data-pipeline.md)

---

## Sprint 2: Clock Agents (Weeks 3-4)

### Goal
Run 4 epigenetic clocks in parallel as ruflo agents with ONNX inference.

### Tasks

#### 2.1 ONNX Model Preparation
- [ ] Export AltumAge to ONNX format (from PyTorch via `pyaging` package)
- [ ] Export GrimAge component models to ONNX (linear surrogates + Cox regression)
- [ ] Obtain DeepStrataAge ONNX model (or re-export from published weights)
- [ ] Export EpInflammAge to ONNX (from HuggingFace)
- [ ] Validate ONNX inference matches original model output within tolerance

#### 2.2 Clock Interface Implementation
- [ ] Define `EpigeneticClock` interface per DDD spec
- [ ] Implement `AltumAgeClock` — wraps ONNX runtime inference
- [ ] Implement `GrimAgeClock` — composite model with DNAm surrogates
- [ ] Implement `DeepStrataAgeClock` — DNN with 12,234 CpG features
- [ ] Implement `EpInflammAgeClock` — two-stage (cytokine + age)
- [ ] Implement `ClockRegistry` for managing all clocks

#### 2.3 Agent Definitions
- [ ] Define 8 agent types in ruflo format:
  - `clock-coordinator`, `altumage-agent`, `grimage-agent`, `deepstrataage-agent`, `epinflamm-agent`, `zk-prover-agent`, `vector-indexer-agent`, `consensus-reporter-agent`
- [ ] Configure hierarchical swarm topology
- [ ] Wire agent communication (clock results → coordinator)

#### 2.4 Parallel Inference
- [ ] Spawn 4 clock agents in parallel via ruflo `swarm_init`
- [ ] Each agent receives methylation data, runs its clock, reports result
- [ ] Collect all 4 results at coordinator
- [ ] Measure total parallel inference time (target: <5s)

### Exit Criteria
- [ ] All 4 clocks produce biological age from the same methylation sample
- [ ] Clocks run in parallel via ruflo swarm (not sequential)
- [ ] ONNX inference matches original implementation within ±0.1 years

### ADRs Referenced
- [ADR-001: Multi-Clock Consensus](../adr/ADR-001-multi-clock-consensus-architecture.md)
- [ADR-004: Agent Orchestration](../adr/ADR-004-agent-orchestration.md)

---

## Sprint 3: Consensus Engine (Week 5)

### Goal
Implement Raft-based weighted consensus across 4 clock outputs.

### Tasks

#### 3.1 Raft Protocol
- [ ] Implement Raft leader election (DeepStrataAge as initial leader by lowest MAE)
- [ ] Implement log replication (each clock's prediction broadcast to all)
- [ ] Implement weighted consensus formula:
  ```
  a_consensus = sum(w_k * a_k) / sum(w_k)
  where w_k = 1 / MAE_k
  ```

#### 3.2 Commitment Logic
- [ ] Implement 3-of-4 agreement check: `|a_k - a_consensus| < epsilon`
- [ ] Default epsilon = 5 years (configurable)
- [ ] Implement consensus failure path (flag for manual review)
- [ ] Compute 95% confidence interval

#### 3.3 Consensus Result
- [ ] Produce `ConsensusAge` aggregate per DDD spec
- [ ] Include all clock results, weights, committed clock count, CI
- [ ] Emit `ConsensusReached` or `ConsensusFailed` domain event

#### 3.4 Testing
- [ ] Unit test: all clocks agree → consensus matches weighted average
- [ ] Unit test: 1 clock outlier → consensus excludes it
- [ ] Unit test: 2+ clocks outlier → consensus fails, flags manual review
- [ ] Integration test: full swarm → consensus with real ONNX models

### Exit Criteria
- [ ] Consensus produces weighted age with 95% CI
- [ ] Correctly identifies and handles outlier clocks
- [ ] Consensus latency <100ms after all clocks report

### ADRs Referenced
- [ADR-001: Multi-Clock Consensus](../adr/ADR-001-multi-clock-consensus-architecture.md)

---

## Sprint 4: ZK Proof Pipeline (Weeks 6-8)

### Goal
Generate and verify zero-knowledge proofs that biological age was computed correctly.

### Tasks

#### 4.1 EZKL Setup
- [ ] Install EZKL (`pip install ezkl` or Rust build)
- [ ] Verify EZKL supports all ONNX operators used by our clocks
- [ ] Document any unsupported operators and workarounds

#### 4.2 Circuit Compilation (Per Clock)
- [ ] Run `ezkl gen-settings` on each ONNX model → circuit settings
- [ ] Run `ezkl compile-circuit` → Halo2 circuit
- [ ] Run `ezkl setup` → proving key (pk) + verification key (vk)
- [ ] Benchmark: circuit size, compilation time, key sizes

#### 4.3 Proof Generation
- [ ] Implement `WitnessGenerator` — converts methylation data to circuit input format
- [ ] Implement `ProofGenerator` — runs `ezkl prove(pk, witness)` → proof (pi)
- [ ] Benchmark proving time per clock (target: 5-30s each)
- [ ] Benchmark aggregate proving time (target: <120s total)

#### 4.4 Proof Verification
- [ ] Implement `ProofVerifier` — runs `ezkl verify(vk, public_output, pi)`
- [ ] Verification should return true/false in <2s
- [ ] Produce `AgeProof` aggregate per DDD spec

#### 4.5 Circuit Optimization (if needed)
- [ ] If proving time exceeds 120s: reduce CpG feature set via feature importance
- [ ] Re-train reduced clock model on top-N CpGs (1000-5000)
- [ ] Re-export to ONNX, re-compile circuit
- [ ] Verify accuracy loss is within acceptable bounds (<0.5 yr MAE increase)

#### 4.6 Proof Composition (Stretch Goal)
- [ ] Compose individual clock proofs + Raft logic into single aggregate proof
- [ ] Use Halo2 accumulation scheme

### Exit Criteria
- [ ] Can generate a ZK proof for at least 1 clock model
- [ ] Proof verifies correctly
- [ ] Proving time <120s for all 4 clocks combined
- [ ] Proof size <100 KB

### ADRs Referenced
- [ADR-002: Zero-Knowledge Proof Pipeline](../adr/ADR-002-zero-knowledge-proof-pipeline.md)

---

## Sprint 5: Knowledge Graph & Recommendations (Weeks 9-10)

### Goal
Build the aging knowledge graph and intervention recommendation engine.

### Tasks

#### 5.1 Knowledge Graph Schema
- [ ] Define Cypher schema per DDD Knowledge Context
- [ ] Create graph nodes: CpGSite, Gene, Pathway, AgingPhase, Intervention
- [ ] Create edges: REGULATES, INVOLVED_IN, ASSOCIATED_WITH, REDUCES_ACCELERATION
- [ ] Populate from literature: Horvath CpG sites, GrimAge pathway associations

#### 5.2 Intervention Data
- [ ] Curate intervention dataset from published literature:
  - Exercise protocols and their effect on epigenetic age
  - Dietary interventions (caloric restriction, Mediterranean diet)
  - Supplements with published methylation effects
  - Pharmacological interventions (metformin, rapamycin analogs)
- [ ] Store as intervention vectors in RuVector

#### 5.3 Recommendation Engine
- [ ] Implement `InterventionRecommender`:
  1. Query HNSW for k nearest profiles to patient embedding
  2. Filter by negative age acceleration (bio < chrono)
  3. Identify interventions associated with those profiles
  4. Rank by effect size and evidence strength
- [ ] Return personalized recommendations with confidence scores

#### 5.4 Temporal Tracking
- [ ] Implement `TemporalTracker` using RuVector `brain_temporal` and `brain_drift`
- [ ] Store successive embeddings per subject
- [ ] Compute aging velocity: d(bio_age)/dt
- [ ] Detect anomalies: sudden trajectory deviations → clinical alert

### Exit Criteria
- [ ] Knowledge graph has CpG→Gene→Pathway→AgingPhase chains for top 1000 CpGs
- [ ] Intervention recommender returns ranked suggestions for a test profile
- [ ] Temporal tracker computes aging velocity from 2+ timepoints

### ADRs Referenced
- [ADR-003: Vector Knowledge Graph](../adr/ADR-003-vector-knowledge-graph.md)

---

## Sprint 6: Integration & API (Weeks 11-12)

### Goal
Wire everything end-to-end and expose an external API.

### Tasks

#### 6.1 End-to-End Pipeline
- [ ] Implement `ChronosSwarm.runPipeline()` — full flow:
  1. Ingest → 2. Embed → 3. Infer (4 clocks parallel) → 4. Consensus → 5. Prove → 6. Index → 7. Recommend
- [ ] Test with real methylation data (GEO public datasets)
- [ ] Measure total pipeline latency (target: ~3 minutes)

#### 6.2 API Layer
- [ ] `POST /submit` — submit methylation sample, returns runId
- [ ] `GET /result/:runId` — get pipeline result (status, age, proof, recommendations)
- [ ] `POST /verify` — verify a ZK proof independently
- [ ] `GET /knowledge/query` — query the aging knowledge graph
- [ ] `GET /trajectory/:subjectId` — get longitudinal aging trajectory

#### 6.3 Security & Privacy
- [ ] Validate all inputs at API boundary (ADR-005 rules)
- [ ] Ensure methylation data is never logged or persisted in plaintext outside RuVector
- [ ] Run `aidefence_scan` on the codebase
- [ ] Audit proof pipeline for information leakage

#### 6.4 Benchmarking
- [ ] Run 100-sample benchmark: latency distribution, memory peak, proof success rate
- [ ] Profile bottlenecks: is it clock inference, proof generation, or HNSW indexing?
- [ ] Document results in `docs/benchmarks/`

#### 6.5 Documentation
- [ ] API reference documentation
- [ ] Deployment guide (hardware requirements, dependencies)
- [ ] Proof verification guide (for third parties)

### Exit Criteria
- [ ] Full pipeline completes for a real methylation sample
- [ ] API serves all endpoints
- [ ] ZK proof generated and verified end-to-end
- [ ] Pipeline latency within target (~3 min)

---

## Dependencies & Prerequisites

| Dependency | Required By | How to Get |
|-----------|-------------|-----------|
| RuVector | Sprint 1 | Submodule (already in repo) |
| ruflo | Sprint 2 | npm dependency (already in package.json) |
| EZKL | Sprint 4 | `pip install ezkl` or build from source |
| ONNX Runtime | Sprint 2 | `npm install onnxruntime-node` |
| pyaging | Sprint 2 | `pip install pyaging` (for ONNX export) |
| GEO datasets | Sprint 1 | Public download from NCBI GEO |
| AltumAge weights | Sprint 2 | github.com/rsinghlab/AltumAge |

## Risk Register

| Risk | Sprint | Probability | Impact | Mitigation |
|------|--------|------------|--------|------------|
| EZKL can't handle clock's ONNX ops | 4 | Medium | High | Test early in Sprint 2; modify model architecture if needed |
| DeepStrataAge weights not publicly available | 2 | Medium | Medium | Contact TruDiagnostic; fallback to retraining from paper |
| HNSW memory exceeds available RAM | 1 | Low | Medium | Use quantized index or reduce embedding dimension |
| Proof generation >120s | 4 | High | Medium | Feature selection to reduce CpG count; smaller circuits |
| Raft consensus diverges persistently | 3 | Low | Low | Widen epsilon; add manual override path |

## Success Metrics

| Metric | Target | Measured In |
|--------|--------|------------|
| Pipeline latency | <3 minutes | Sprint 6 |
| ZK proof generation | <120 seconds | Sprint 4 |
| HNSW query time | <1ms | Sprint 1 |
| Consensus agreement rate | >90% of samples | Sprint 3 |
| Clock ONNX parity | <±0.1 yr vs original | Sprint 2 |
| Proof verification | 100% correct | Sprint 4 |
