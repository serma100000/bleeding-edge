# ruqu-wasm Quantum Enhancement Plan for CHRONOS

**Date**: 2026-03-21
**Status**: Planning / Feasibility Assessment
**Package**: `@ruvector/ruqu-wasm` v2.0.5

---

## Executive Summary

This document evaluates five proposed integration points between `@ruvector/ruqu-wasm` (a 25-qubit browser-based quantum circuit simulator) and the CHRONOS epigenetic age prediction system. The honest conclusion: **one integration has genuine practical value (QAOA for clock weight optimization), one has future scientific value (VQE for molecular modeling), and the remaining three range from marginal to pure theater at the 25-qubit scale.** The recommended path is to integrate QAOA as a Phase 2 enhancement and VQE as a research-track feature.

---

## 1. Grover's Search for Knowledge Graph

### What Was Proposed

Use Grover's algorithm to search CpG -> Gene -> Pathway -> AgingPhase chains in the `AgingKnowledgeGraph`, exploiting the quadratic speedup (O(sqrt(N)) vs O(N)) over brute-force search.

### Current State of the Knowledge Graph

The graph in `src/knowledge/knowledge-graph.ts` is an adjacency-list structure with:
- 20 seeded CpG-Gene-Pathway associations
- 15 interventions
- ~100 total nodes and edges
- Queries use direct adjacency traversal (e.g., `queryCausalChain` walks CpG -> Gene edges -> Pathway edges -> Phase edges)

### Feasibility Assessment: NOT USEFUL

**The math kills this immediately.**

- Grover's provides quadratic speedup over *unstructured* search. The knowledge graph is *structured* -- it uses adjacency lists. Walking three hops through an adjacency list is O(degree^3), which for this graph means examining maybe 10-50 combinations per CpG query. Grover's speedup over sqrt(50) is irrelevant.
- Even if the graph scaled to millions of nodes, HNSW (already enabled in the project config) provides O(log N) approximate nearest neighbor search, which beats Grover's O(sqrt(N)) for any N we would encounter in practice.
- 25 qubits = 2^25 = ~33M searchable items. The Illumina EPIC array has ~850K CpG sites. But encoding the graph structure into an oracle function for Grover's would consume most of those qubits on the oracle itself, leaving far fewer for the actual search space.
- Gate time at 25 qubits is 150ms per gate. A Grover iteration requires O(sqrt(N)) oracle calls, each involving multiple gates. This would be *slower* than a JavaScript Map lookup.

**Verdict: No. This is quantum theater. Classical graph traversal and HNSW are categorically better for this problem.**

### What Would Actually Help the Knowledge Graph

If the graph scales to 100K+ nodes, invest in a proper graph database (Neo4j/rvlite) or improve the HNSW index. Both are orders of magnitude more practical.

---

## 2. VQE for Molecular Interaction Modeling

### What Was Proposed

Use the Variational Quantum Eigensolver to model drug-CpG molecular interactions at the quantum chemistry level, enhancing intervention recommendations in `src/knowledge/recommender.ts`.

### Current State of the Recommender

The `InterventionRecommender` uses cosine similarity on embeddings to find "younger" profiles, then aggregates which interventions those similar profiles used. It does not model molecular mechanisms -- it is purely statistical/epidemiological.

### Feasibility Assessment: SCIENTIFICALLY INTERESTING, PRACTICALLY LIMITED

**What 25 qubits can simulate:**

- Molecular hydrogen (H2): 4 qubits in minimal basis (STO-3G)
- Lithium hydride (LiH): 10-12 qubits
- Beryllium hydride (BeH2): ~14 qubits
- Water (H2O): ~14 qubits in minimal basis
- Small organic fragments: up to ~20 qubits with aggressive active space reduction

**What 25 qubits cannot simulate:**

- Any drug molecule (metformin alone is C4H11N5 -- hundreds of qubits needed for useful accuracy)
- DNA methylation chemistry (cytosine + methyl group interactions)
- Protein-DNA binding
- Basically any biologically relevant molecule at useful accuracy

**Where VQE could add marginal value:**

- Modeling the electronic structure of the methyl group transfer reaction (SAM -> cytosine) in a minimal active space (~8-12 qubits). This gives you energy surfaces for the methylation reaction itself.
- Toy models of small-molecule interactions with simplified Hamiltonians that capture qualitative behavior.
- Educational/demonstration value: showing users that the platform can simulate the quantum chemistry underlying epigenetic modification.

**Honest assessment**: At 25 qubits, VQE cannot produce results that improve intervention recommendations beyond what the current cosine-similarity approach already provides. The molecular systems are too small to be biologically actionable. However, as quantum hardware scales (50-100 qubits), this becomes genuinely valuable for modeling drug-methylation interactions. Building the integration now creates a pathway for future utility.

**Verdict: Research track only. Build the VQE integration as a "quantum chemistry explorer" feature that demonstrates the science but do not route it into the recommendation engine's decision path.**

---

## 3. QAOA for Clock Weight Optimization

### What Was Proposed

Use the Quantum Approximate Optimization Algorithm to find optimal weights for the multi-clock consensus system in `src/clocks/consensus.ts`.

### Current State of Clock Consensus

`ClockConsensus` computes weights as `1/MAE` for each clock, normalizes them, then does a weighted average with a Byzantine-style "committed clocks" filter (clocks within epsilon of the weighted average get re-weighted). This is a static heuristic -- it does not optimize weights against any objective function.

### Problem Structure

With 4 epigenetic clocks (Horvath, Hannum, PhenoAge, GrimAge), the optimization problem is:
- Find weights w1..w4 (continuous, summing to 1) that minimize prediction error
- Subject to: consensus stability (committed clock count >= minCommitted), robustness to outlier clocks
- This is a small combinatorial optimization problem if discretized

### Feasibility Assessment: GENUINELY USEFUL (WITH CAVEATS)

**Why this works:**

- The problem is small enough. 4 clocks with discretized weights (e.g., 10 levels each) = 10^4 = 10,000 combinations. Even with constraints, this fits comfortably in 14-16 qubits, well under the 25-qubit limit.
- QAOA is designed for exactly this class of problem: combinatorial optimization with constraints.
- The current `1/MAE` heuristic is a reasonable default but provably suboptimal. Different patient cohorts (by age, sex, ethnicity, tissue type) likely benefit from different weight profiles. QAOA could find per-cohort optimal weights.
- At 16 qubits, gate time is ~0.1ms, and QAOA with p=3-5 layers would complete in under 1 second. This is fast enough for batch optimization (not per-request, but per-cohort precomputation).

**The caveats:**

- Classical optimization (grid search, Bayesian optimization, even brute force at 10K combinations) would also solve this problem trivially. The quantum advantage is marginal at this scale.
- The real value comes if the problem grows: more clocks (e.g., 10+), more constraints (tissue-specific, interaction terms), or if we add per-CpG weighting (850K dimensions -- though this exceeds 25 qubits).
- QAOA on a simulator does not provide quantum speedup. It provides *the same answer* a classical optimizer would, just computed via a different algorithm. The speedup only materializes on actual quantum hardware.

**What makes this the best candidate:**

- It solves a real limitation in the current system (static weights).
- The problem maps cleanly to QAOA's strengths.
- It runs fast enough at 16 qubits to be practical.
- It demonstrates genuine quantum-classical hybrid computing, not theater.
- It creates a natural upgrade path: when real quantum hardware is accessible, the same QAOA circuit runs faster.

**Verdict: Yes. This is the recommended integration. Phase 2 priority.**

---

## 4. Quantum Error Correction + ZK Proofs

### What Was Proposed

Use surface code error correction concepts from ruqu-wasm to enhance ZK proof verification reliability in `src/proofs/circuit-compiler.ts`.

### Current State of ZK Proofs

The `CircuitCompiler` is a **simulation layer** -- it does not run actual ZK proofs. It hashes ONNX model buffers, generates deterministic "circuit" identifiers, and produces mock proving/verification keys. There is no actual cryptographic proving happening.

### Feasibility Assessment: NOT APPLICABLE

**The fundamental mismatch:**

- Quantum error correction (QEC) protects quantum states from decoherence. ZK proof verification is a classical computation. These are solving completely different problems.
- Surface codes use syndrome measurements to detect and correct qubit errors. ZK proofs use polynomial commitments and Fiat-Shamir heuristics. There is no mathematical bridge between these.
- "Quantum-inspired error detection" is not a real technique. Error-correcting codes (classical, like Reed-Solomon) already exist and are used in ZK proof systems where needed.
- The circuit compiler is simulated anyway. Adding quantum error correction to a simulated proof system is theater on top of theater.

**The one interesting (but academic) connection:**

Quantum error correction and ZK proofs both involve encoding redundant information to detect tampering/errors. A research paper could explore "quantum-verifiable proofs" where a quantum circuit encodes the proof witness and surface code syndromes serve as an integrity check. But this is pure research with no practical application at 25 qubits.

**Verdict: No. This is a category error. Do not pursue.**

---

## 5. "Quantum-Enhanced" as a Feature / Marketing

### Honest Assessment

**What is genuine:**
- QAOA for clock weight optimization is a real quantum algorithm solving a real optimization problem. Even on a simulator, it demonstrates the correct computational paradigm and produces valid results.
- VQE for methylation chemistry, while limited at 25 qubits, is real quantum chemistry running real Hamiltonians.
- Running these in WASM in the browser is technically impressive and genuinely differentiating.

**What is theater:**
- Grover's search on a graph that has 100 nodes
- Quantum error correction for simulated ZK proofs
- Any claim of "quantum speedup" when running on a classical simulator

**Marketing recommendation:**
- Use "Quantum-Ready" rather than "Quantum-Enhanced" -- honest framing that the architecture supports quantum algorithms and will benefit as hardware scales
- Lead with the QAOA clock optimization as the hero feature: "Quantum-optimized biological age consensus"
- Position VQE as "Quantum chemistry explorer" -- a forward-looking research feature
- Never claim speedup from simulation. The value proposition is algorithmic correctness and hardware-readiness, not performance.

**The most real benefit:**
QAOA for clock weight optimization is the most defensible. It solves a real problem (the current 1/MAE weighting is a known-suboptimal heuristic), uses a quantum algorithm appropriately, and creates genuine upgrade potential when quantum hardware becomes accessible via cloud APIs.

---

## Recommended Integration Plan

### Phase 2: QAOA Clock Weight Optimizer

**Priority**: Medium-High
**Effort**: ~2 weeks
**Genuine value**: Yes

#### Architecture Changes

1. **New module**: `src/clocks/qaoa-weight-optimizer.ts`
   - Takes: clock MAE values, validation dataset, constraint parameters
   - Returns: optimized weight vector per cohort
   - Uses `@ruvector/ruqu-wasm` QAOA with 14-16 qubits

2. **Modify**: `src/clocks/consensus.ts`
   - Add `computeWeightsQAOA()` alternative to `computeWeights()`
   - Accept pre-optimized weight profiles from the QAOA optimizer
   - Fall back to 1/MAE heuristic if QAOA module is not loaded (tree-shaking friendly)

3. **New module**: `src/clocks/cohort-weights.ts`
   - Cache QAOA-optimized weights per cohort (age bracket, sex, tissue type)
   - Batch precomputation during off-peak (Web Worker)

4. **Integration point**: The QAOA optimizer runs as a batch job (not per-request). It precomputes optimal weights for each cohort, which `ClockConsensus` then looks up at request time.

#### Why This Works

- The `computeWeights` method in `ClockConsensus` is a clean extension point
- QAOA weight vectors can be serialized and cached
- The Web Worker example in ruqu-wasm's README shows exactly this pattern
- No changes needed to the API surface or proof system

### Future Phase: VQE Methylation Explorer

**Priority**: Low
**Effort**: ~3 weeks
**Genuine value**: Educational/research only

#### Architecture Changes

1. **New module**: `src/knowledge/quantum-chemistry-explorer.ts`
   - Provides VQE-computed energy surfaces for methylation reactions
   - 8-12 qubit Hamiltonians for SAM-cytosine methyl transfer
   - Visualization-ready output (energy vs. reaction coordinate)

2. **Extend**: `src/knowledge/knowledge-graph.ts`
   - Add optional `quantumChemistryData` field to CpGSite nodes
   - Link to VQE-computed energy surfaces where available

3. **No changes to**: `src/knowledge/recommender.ts`
   - The VQE data feeds the knowledge graph for display purposes only
   - It does NOT influence recommendation scoring (insufficient accuracy)

### Not Recommended

| Integration | Reason |
|---|---|
| Grover's for Knowledge Graph | Classical graph traversal and HNSW are faster at every relevant scale |
| QEC for ZK Proofs | Category error; the proof system is simulated anyway |

---

## Summary Decision Matrix

| Integration Point | Genuine Value | Practical at 25 Qubits | Recommended | Phase |
|---|---|---|---|---|
| Grover's Search | No | No | No | -- |
| VQE Molecular Modeling | Future only | Barely (toy models) | Research track | Future |
| QAOA Clock Weights | Yes | Yes (14-16 qubits) | **Yes** | Phase 2 |
| QEC + ZK Proofs | No | No | No | -- |
| Marketing / Feature | Conditional | N/A | "Quantum-Ready" framing | Phase 2 |

---

## Key Files Referenced

- `RuVector/npm/packages/ruqu-wasm/package.json` -- quantum simulator package
- `RuVector/npm/packages/ruqu-wasm/README.md` -- API reference and performance data
- `src/clocks/consensus.ts` -- multi-clock consensus (primary integration target)
- `src/knowledge/knowledge-graph.ts` -- aging knowledge graph
- `src/knowledge/recommender.ts` -- intervention recommender
- `src/proofs/circuit-compiler.ts` -- ZK proof simulation
