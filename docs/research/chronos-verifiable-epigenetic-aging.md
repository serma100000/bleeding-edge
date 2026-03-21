# CHRONOS: Cryptographically Honest, Reproducible, Orchestrated Network for Omics-based Senescence

## A Verifiable Multi-Clock Epigenetic Age Estimation System with Zero-Knowledge Proofs and Vector Knowledge Graph-Driven Intervention Recommendations

---

**Authors:** Project CHRONOS Research Group

**Date:** March 2026

**Keywords:** epigenetic clocks, biological age, zero-knowledge proofs, Byzantine fault tolerance, vector knowledge graphs, DNA methylation, privacy-preserving genomics, HNSW indexing, deep learning, verifiable inference

---

## Abstract

We present CHRONOS (Cryptographically Honest, Reproducible, Orchestrated Network for Omics-based Senescence), a system that computes verifiable biological age estimates from DNA methylation array data while preserving patient genomic privacy through zero-knowledge proofs. CHRONOS ingests Illumina 450K and EPIC array data, executes four parallel deep learning epigenetic clocks---AltumAge, GrimAge, DeepStrataAge, and EpInflammAge---and reaches Byzantine fault-tolerant consensus across their outputs via the Raft protocol. CpG site embeddings and aging trajectories are stored in a vector knowledge graph with Hierarchical Navigable Small World (HNSW) indexing, enabling sub-millisecond similarity searches across hundreds of thousands of methylation loci. Zero-knowledge proofs generated via EZKL and Halo2 cryptographically attest that age predictions were computed correctly without exposing underlying methylation data. Finally, CHRONOS provides personalized intervention recommendations through vector similarity search across the knowledge graph. This paper evaluates the novelty, technical feasibility, competitive landscape, and ethical dimensions of the proposed system against the current state of the art in epigenetic aging, privacy-preserving genomics, and verifiable machine learning.

---

## 1. Introduction and Motivation

### 1.1 The Epigenetic Aging Revolution

DNA methylation patterns at cytosine-guanine dinucleotides (CpG sites) serve as robust biomarkers of biological aging, providing information beyond chronological age about an individual's functional capacity, disease risk, and mortality probability [1, 2]. Since Horvath's seminal 2013 multi-tissue clock [3], the field has evolved from simple linear models to sophisticated deep learning architectures capable of capturing non-linear aging dynamics and CpG-CpG interactions [4, 5, 6].

The recent surge in deep learning-based clocks---including AltumAge [4], DeepStrataAge [5], and EpInflammAge [6]---has achieved mean absolute errors as low as 1.89 years, while simultaneously improving interpretability through SHAP-based attribution methods [5]. A comprehensive 2025 review of AI-powered aging clocks documents the transition from elastic net regularization to deep neural networks as the dominant modeling paradigm [7].

### 1.2 The Verification Gap

Despite these advances, a critical gap persists: there is no mechanism to cryptographically verify that a biological age prediction was computed correctly from a given methylation sample, nor to prove this without revealing the underlying genomic data. This gap has practical consequences across multiple domains:

- **Clinical trials:** The longevity biotechnology industry increasingly relies on biological age as a surrogate endpoint [8, 9], yet trial integrity requires verifiable computation.
- **Insurance and employment:** The Genetic Information Nondiscrimination Act (GINA) prohibits discrimination based on genetic information [10], but verification of age-related biomarkers without data disclosure would strengthen these protections.
- **Regulatory compliance:** Life Biosciences' January 2026 FDA clearance of ER-100---the first cellular rejuvenation therapy using partial epigenetic reprogramming to enter human clinical trials [11]---signals that regulatory bodies will soon require standardized, auditable biological age assessments.

### 1.3 The Multi-Clock Consensus Problem

Individual epigenetic clocks exhibit systematic biases: some underestimate age in the elderly [5], others are tissue-specific [4], and mortality-predictive clocks like GrimAge capture different aging dimensions than chronological clocks [12, 13]. No single clock is universally optimal. Mount Sinai's 2026 study demonstrated that orchestrated multi-agent AI systems outperform single agents in healthcare, reducing computational demands by up to 65-fold while sustaining performance [14]. Applying Byzantine fault-tolerant consensus to multi-clock estimation would provide robust age estimates resilient to individual clock failures.

### 1.4 Contributions

CHRONOS addresses these gaps by integrating:

1. **Multi-clock parallel inference** with four complementary deep learning clocks
2. **Byzantine fault-tolerant consensus** via the Raft protocol for robust age estimation
3. **Zero-knowledge proof generation** via EZKL/Halo2 for verifiable, privacy-preserving computation
4. **Vector knowledge graph storage** with HNSW indexing for CpG embeddings and aging trajectories
5. **Personalized intervention recommendations** via vector similarity search

To our knowledge, CHRONOS is the first system to combine verifiable machine learning inference with multi-clock epigenetic age consensus and privacy-preserving genomic computation.

---

## 2. Background and Related Work

### 2.1 Deep Learning Epigenetic Clocks

#### 2.1.1 AltumAge

AltumAge [4] is a pan-tissue DNA methylation clock based on deep neural networks, trained on 142 publicly available datasets. Compared to ElasticNet-based clocks, AltumAge demonstrates superior generalizability, particularly for older ages and novel tissue types. The model captures global age-related epigenetic patterns rather than tissue-specific blood changes. AltumAge is accessible through the pyaging Python package [15], which harmonizes dozens of aging clocks with GPU-accelerated inference via a PyTorch backend.

#### 2.1.2 GrimAge and GrimAge2

GrimAge [12] was trained on time-to-death data and has consistently outperformed chronological clocks in predicting morbidity and mortality. GrimAge2 [13] extends the original by incorporating DNAm-based estimators of high-sensitivity C-reactive protein (logCRP) and hemoglobin A1C (logA1C), improving mortality prediction across multiple racial and ethnic groups. A 2025 retrospective cohort study confirmed that both GrimAge and GrimAge2 age acceleration metrics demonstrate approximately linear, positive associations with all-cause, cancer-specific, and cardiac mortality [16].

#### 2.1.3 DeepStrataAge

DeepStrataAge [5], published in npj Aging in 2026, is a deep neural network clock trained on 29,167 samples profiled on Illumina EPIC v1.0 and v2.0 arrays. It achieved a mean absolute error of 1.89 years in external validation, outperforming both traditional linear and recent deep learning clocks. DeepStrataAge's key innovation is the resolution of four broad epigenetic aging phases: an early-life wave (<35 years), early-midlife reconfiguration (35--44), late-midlife transition (45--64), and late-life remodeling (65+). Integration of SHAP enables individual-level attribution of CpG influence [5].

#### 2.1.4 EpInflammAge

EpInflammAge [6], published in the International Journal of Molecular Sciences (MDPI) in 2025, bridges epigenetic alterations and immunosenescence by integrating DNA methylation with 24 inflammatory cytokine markers. The model uses state-of-the-art deep neural networks optimized for tabular data, achieving competitive performance against 34 epigenetic clock models with a mean absolute error of 7 years in healthy controls and a Pearson correlation of 0.85 [6]. The model is available through a HuggingFace web interface.

### 2.2 Privacy-Preserving Genomics

#### 2.2.1 Homomorphic Encryption Approaches

Mualem et al. [17] demonstrated privacy-preserving biological age prediction over federated methylation data using fully homomorphic encryption (FHE), computing the Epigenetic Pacemaker model without exposing raw methylation values. A 2025 framework employing multi-key homomorphic encryption [18] enables genomic analyses where each data owner encrypts with unique keys, mitigating single-point-of-failure risks. However, FHE-based approaches suffer from high computational overhead and communication complexity that limits scalability to large datasets [17].

#### 2.2.2 Federated Learning with Privacy Guarantees

FREDA [19] employs federated training of Gaussian processes and weighted elastic nets with secure aggregation and randomized encoding for privacy-preserving age prediction from methylation data across distributed institutions. This approach performs comparably to centralized methods while maintaining data privacy.

#### 2.2.3 Zero-Knowledge Proofs in Healthcare

Recent work has explored ZKP applications in healthcare data governance [20, 21]. A 2025 study demonstrated a blockchain-based ZKP framework achieving average query latency of 5.83ms with 90% accuracy for genomic data sharing [22]. A healthcare-specific Byzantine consensus protocol using ZKPs demonstrated 100% consensus accuracy with up to 33% Byzantine nodes in a 4-agent network [23].

### 2.3 Zero-Knowledge Machine Learning (ZKML)

#### 2.3.1 The EZKL Framework

EZKL [24] is an open-source engine for generating zero-knowledge proofs of deep learning inference. It converts ONNX model files into ZK-SNARK circuits based on an improved version of Halo2 [25], the proving system developed by Zcash. EZKL supports approximately 50 of the 120+ ONNX operators, with attention mechanisms being added in 2024--2025 [26]. A comprehensive 2025 survey of ZKP-based verifiable machine learning catalogs 27 notable schemes from 2017 to 2024 [27].

#### 2.3.2 Halo2 Proving System

Halo2 [25] is a high-performance zk-SNARK implementation written in Rust that eliminates the need for a trusted setup through an Inner Product Argument (IPA) based on Pedersen commitments. Halo2 employs Plonkish arithmetization with support for custom gates and lookup tables, and uses accumulation for recursive proof composition. It has been widely adopted by Protocol Labs, the Ethereum Foundation, Scroll, and Taiko [25].

#### 2.3.3 Computational Constraints

EZKL benchmarks indicate mean proof generation times of approximately 8.15 seconds with peak RAM usage of ~1050 MB for tested models [28]. However, proving key sizes can reach hundreds of gigabytes for extremely large models, and unsupported operations (softmax, certain normalizations) can cause circuit compilation failures [26, 28].

### 2.4 Multi-Agent Consensus in Medical AI

#### 2.4.1 Mount Sinai Multi-Agent Study

Nadkarni et al. [14] demonstrated in a March 2026 npj Health Systems paper that distributing healthcare AI tasks among specialized agents reduces computational demands by up to 65-fold while sustaining performance as task volume increases. This validates the multi-agent paradigm for clinical decision support.

#### 2.4.2 EvoMDT

EvoMDT [29], published in npj Digital Medicine in 2025, structures clinical deliberation into role-specialized agents with a safety-first coordinator, employing Byzantine fault-tolerant consensus protocols. EvoMDT consistently outperformed foundation models including Llama3-70B, Claude-3, and Med-PaLM 2 across oncology benchmarks.

#### 2.4.3 MedBeads

MedBeads [30] (arXiv:2602.01086) proposes an agent-native, immutable data substrate where clinical events are nodes in a Merkle Directed Acyclic Graph (DAG) with cryptographic provenance. This write-once, read-many architecture makes tampering mathematically detectable, with O(V+E) context retrieval via breadth-first search.

### 2.5 Vector Databases and Knowledge Graphs in Biomedicine

Biomedical Knowledge Graphs (BKGs), formally defined as G = (E, R, F) where E is entities, R is relations, and F is factual triples [31], have been applied across multi-omics, pharmacology, and clinical domains. HNSW indexing [32] enables sub-millisecond approximate nearest-neighbor queries on millions of high-dimensional vectors, though with significant memory requirements. CpGPT [33] and MethylNet [34] have demonstrated that CpG sites can be meaningfully embedded in low-dimensional vector spaces, with autoencoder-based methods achieving up to 400-fold dimensionality reduction without compromising predictive power [35].

---

## 3. System Architecture

### 3.1 Architecture Overview

```
+------------------------------------------------------------------+
|                        CHRONOS SYSTEM                            |
+------------------------------------------------------------------+
|                                                                  |
|  +-------------------+     +-------------------------------+     |
|  | DATA INGESTION    |     | VECTOR KNOWLEDGE GRAPH        |     |
|  |                   |     | (RuVector + HNSW)              |     |
|  | Illumina 450K/    |     |                               |     |
|  | EPIC .idat files  |---->| CpG Embeddings (d=256)        |     |
|  |                   |     | Aging Trajectories            |     |
|  | Preprocessing:    |     | Intervention Vectors          |     |
|  |  - QC & Filtering |     | Patient Similarity Graphs     |     |
|  |  - Normalization  |     +-------------------------------+     |
|  |  - Beta values    |          |           ^                    |
|  +-------------------+          |           |                    |
|          |                      v           |                    |
|          v               +-----------+      |                    |
|  +-------------------+   | RETRIEVAL |      |                    |
|  | MULTI-CLOCK       |   | ENGINE    |------+                    |
|  | INFERENCE ENGINE  |   |           |                           |
|  |                   |   | kNN query |                           |
|  | +------+ +------+ |   | Interven- |                           |
|  | |Altum | |Grim  | |   | tion Rec. |                           |
|  | |Age   | |Age   | |   +-----------+                           |
|  | +------+ +------+ |        |                                  |
|  | +------+ +------+ |        v                                  |
|  | |Deep  | |EpIn  | |   +------------------+                    |
|  | |Strata| |flamm | |   | RECOMMENDATION   |                    |
|  | |Age   | |Age   | |   | ENGINE           |                    |
|  | +------+ +------+ |   |                  |                    |
|  +-------------------+   | Personalized     |                    |
|          |                | Interventions    |                    |
|          v                +------------------+                    |
|  +-------------------+                                           |
|  | RAFT CONSENSUS    |                                           |
|  |                   |                                           |
|  | Leader Election   |                                           |
|  | Log Replication   |                                           |
|  | BFT Agreement     |                                           |
|  | Weighted Voting   |                                           |
|  +-------------------+                                           |
|          |                                                       |
|          v                                                       |
|  +-------------------+     +------------------+                  |
|  | CONSENSUS AGE     |---->| ZK PROOF ENGINE  |                  |
|  | ESTIMATE          |     | (EZKL / Halo2)   |                  |
|  |                   |     |                  |                  |
|  | age_consensus     |     | ONNX -> Circuit  |                  |
|  | confidence_interval|    | Proof Generation |                  |
|  | clock_weights     |     | Verification Key |                  |
|  +-------------------+     +------------------+                  |
|                                    |                             |
|                                    v                             |
|                            +------------------+                  |
|                            | VERIFIABLE OUTPUT |                 |
|                            |                  |                  |
|                            | age_estimate     |                  |
|                            | zk_proof (pi)    |                  |
|                            | verification_key |                  |
|                            | interventions[]  |                  |
|                            +------------------+                  |
+------------------------------------------------------------------+
```

### 3.2 Component Descriptions

**Data Ingestion Layer.** Accepts raw Illumina .idat files, performs quality control (probe detection p-value filtering, sex chromosome removal), normalization (single-sample noob normalization via minfi [36, 37]), and outputs beta-value matrices. Cross-platform harmonization between 450K (~485,000 CpG sites) and EPIC (~850,000 CpG sites) arrays follows established pipelines [38].

**Multi-Clock Inference Engine.** Executes four deep learning clocks in parallel, each exported as ONNX models for standardized inference and ZK circuit compilation. The clocks are selected to span complementary aging dimensions: chronological (AltumAge, DeepStrataAge), mortality-predictive (GrimAge), and inflammaging (EpInflammAge).

**Raft Consensus Module.** Implements the Raft consensus protocol [39] adapted for multi-clock agreement. Each clock acts as a node in the Raft cluster; the leader aggregates predictions with learned weights, and consensus requires agreement from a majority (3 of 4 clocks within a configurable tolerance).

**Vector Knowledge Graph.** Stores CpG site embeddings, patient aging trajectories, and intervention outcome vectors in a RuVector-backed graph with HNSW indexing for approximate nearest-neighbor search.

**ZK Proof Engine.** Uses EZKL [24] to compile each clock's ONNX model into a Halo2-based zk-SNARK circuit, generating proofs that the consensus age was computed correctly from a committed (but hidden) methylation input.

**Recommendation Engine.** Queries the vector knowledge graph for patients with similar CpG embedding profiles and aging trajectories, retrieving interventions associated with positive aging outcomes.

---

## 4. Technical Approach

### 4.1 Methylation Data Preprocessing

Given raw .idat files from an Illumina 450K or EPIC array, preprocessing produces a beta-value vector:

```
beta_j = M_j / (M_j + U_j + alpha)
```

where M_j and U_j are the methylated and unmethylated signal intensities at CpG site j, and alpha = 100 is a regularization offset [37]. Quality control removes probes with detection p-value > 0.01, probes on sex chromosomes, and cross-reactive probes. Normalization employs the single-sample noob (ssNoob) method for cross-platform compatibility [36].

### 4.2 CpG Embedding Generation

Following the autoencoder approach demonstrated in mEthAE [35] and MethylNet [34], we learn a low-dimensional embedding for each CpG site. Given a beta-value matrix B of dimension (n_samples x p_CpGs), an encoder network f_enc maps each sample's methylation profile to a d-dimensional embedding:

```
z_i = f_enc(B_i) where z_i in R^d, d << p
```

We set d = 256, achieving approximately 1,800-fold dimensionality reduction from the ~450,000 CpG sites on the 450K array. The encoder is trained jointly with a decoder f_dec to minimize reconstruction loss:

```
L_recon = (1/n) * sum_i ||B_i - f_dec(f_enc(B_i))||^2
```

augmented with an age-prediction auxiliary loss to ensure embeddings retain aging-relevant information:

```
L_total = L_recon + lambda * L_age(f_age(z_i), y_i)
```

where y_i is the chronological age and lambda balances reconstruction fidelity with age prediction.

### 4.3 HNSW Indexing

CpG embeddings are indexed using HNSW [32], a graph-based approximate nearest-neighbor algorithm that constructs a multi-layer navigable small-world graph. Given n embedding vectors in R^d:

- **Construction complexity:** O(n * log(n))
- **Query complexity:** O(log(n)) for retrieving k nearest neighbors
- **Memory:** O(n * d * M) where M is the maximum number of connections per layer

For n = 450,000 CpG sites with d = 256 and M = 16, the index requires approximately 28 GB of RAM. For patient-level embeddings (n = 100,000 patients), the index requires approximately 6.4 GB, well within modern server capacity.

### 4.4 Multi-Clock Parallel Inference

Each clock C_k (k in {1, 2, 3, 4}) computes an age estimate from the preprocessed beta-value vector:

```
a_k = C_k(beta) for k in {AltumAge, GrimAge, DeepStrataAge, EpInflammAge}
```

The clocks are characterized by distinct properties:

| Clock | Type | MAE (years) | Primary Signal | Array Support |
|-------|------|-------------|----------------|---------------|
| AltumAge | DNN, pan-tissue | ~2.5 | Chronological aging | 450K, EPIC |
| GrimAge | Composite, DNAm surrogates | ~3.5 | Mortality risk | 450K, EPIC |
| DeepStrataAge | DNN, stratified | 1.89 | Non-linear dynamics | EPIC v1/v2 |
| EpInflammAge | DNN, inflammatory | 7.0 | Inflammaging | 450K, EPIC |

### 4.5 Byzantine Fault-Tolerant Consensus via Raft

We adapt the Raft consensus protocol [39] for multi-clock agreement. In classical Raft, consensus requires a majority of N/2 + 1 nodes. With N = 4 clocks, we require agreement from at least 3 clocks within a tolerance epsilon:

**Leader Election.** The clock with the lowest historical MAE on a calibration dataset is elected leader. In the current configuration, DeepStrataAge serves as the initial leader given its 1.89-year MAE [5].

**Log Replication.** Each clock's prediction a_k is broadcast to all other clocks (log entries). The leader proposes a weighted consensus:

```
a_consensus = sum_k (w_k * a_k) / sum_k (w_k)
```

where weights w_k are inversely proportional to each clock's calibration MAE:

```
w_k = 1 / MAE_k
```

**Commitment.** A prediction is committed when at least 3 of 4 clocks produce estimates within epsilon of the weighted consensus:

```
|a_k - a_consensus| < epsilon for at least 3 clocks
```

If fewer than 3 clocks agree, the system flags the sample for manual review, as disagreement may indicate pathological aging patterns or data quality issues.

**Confidence Interval.** The consensus confidence interval is computed as:

```
CI_95 = a_consensus +/- 1.96 * sqrt(sum_k w_k * (a_k - a_consensus)^2 / sum_k w_k)
```

### 4.6 Zero-Knowledge Proof Generation

The ZK proof pipeline ensures that a verifier can confirm the correctness of the age computation without learning the patient's methylation data.

**Proof Statement.** For a given patient with methylation vector beta (private witness) and consensus age a_consensus (public output), the prover generates a proof pi such that:

```
Verify(vk, a_consensus, pi) = 1
```

if and only if there exists a beta such that:

```
a_consensus = RaftConsensus(C_1(beta), C_2(beta), C_3(beta), C_4(beta))
```

**Circuit Compilation.** Each clock C_k is exported to ONNX format and compiled to a Halo2 arithmetic circuit via EZKL [24]. The compilation process:

1. **Quantization:** Model weights and activations are quantized to fixed-point representation compatible with finite field arithmetic
2. **Circuit generation:** ONNX operations are mapped to Plonkish gates and lookup tables
3. **Trusted setup elimination:** Halo2's IPA-based commitment scheme avoids trusted setup ceremonies [25]

**Proof Composition.** Individual clock proofs are composed with the Raft consensus logic into a single aggregate proof using Halo2's accumulation scheme:

```
pi_aggregate = Accumulate(pi_C1, pi_C2, pi_C3, pi_C4, pi_raft)
```

### 4.7 Intervention Recommendation via Vector Similarity

Given a patient's embedding z_patient and consensus age a_consensus, the recommendation engine:

1. Queries the HNSW index for the k nearest neighbors in embedding space:
   ```
   N_k(z_patient) = {z_j : z_j in top-k by ||z_patient - z_j||_2}
   ```

2. Filters neighbors by age acceleration (biological age - chronological age):
   ```
   delta_j = a_consensus_j - chronological_age_j
   ```

3. Identifies interventions associated with negative age acceleration (biological age younger than chronological):
   ```
   Interventions = {I_m : avg(delta_j | I_m applied to j) < -tau}
   ```

4. Ranks interventions by effect size and evidence strength, returning a personalized recommendation set.

### 4.8 Temporal Aging Trajectory Tracking

For longitudinal patients, CHRONOS stores successive embeddings z_patient(t_1), z_patient(t_2), ..., z_patient(t_n), enabling:

- **Trajectory visualization** in the embedding space
- **Rate-of-aging estimation:** d(a_biological)/dt
- **Intervention response monitoring:** delta_z after treatment initiation
- **Anomaly detection:** Sudden trajectory deviations flagged for clinical review

---

## 5. Novelty Analysis and Competitive Landscape

### 5.1 Gap Analysis

| Capability | Existing Work | CHRONOS |
|------------|---------------|---------|
| Multi-clock ensemble | Individual clocks run independently [4, 5, 6, 12] | BFT consensus across 4 clocks |
| Privacy preservation | FHE-based [17, 18], federated [19] | ZK-SNARK proofs (no trusted third party) |
| Verifiable computation | None for epigenetic clocks | EZKL/Halo2 circuit proofs |
| CpG embeddings | CpGPT [33], MethylNet [34] | HNSW-indexed vector knowledge graph |
| Intervention recommendation | Manual clinical interpretation | Automated vector similarity search |
| Temporal tracking | Cross-sectional studies predominant | Longitudinal trajectory analysis |

### 5.2 Competitive Landscape

**Commercial aging clocks.** TruDiagnostic (DeepStrataAge developer) [5], Elysium Health (Index), and GlycanAge offer commercial biological age testing but without verifiability or privacy guarantees. None combine multiple deep learning clocks with consensus mechanisms.

**Privacy-preserving genomics platforms.** iDash competition winners and frameworks like FREDA [19] use FHE or secure multi-party computation but have not been applied to deep learning clock inference with ZK proofs.

**ZKML platforms.** EZKL [24], zkPyTorch [40], and Lagrange support verifiable ML inference but have not been applied to genomic or epigenetic domains.

**Multi-agent medical AI.** EvoMDT [29] and the Mount Sinai multi-agent system [14] demonstrate multi-agent consensus in clinical settings but not for biological age estimation.

### 5.3 Novel Contributions

CHRONOS is, to our knowledge, the first system to:

1. Apply zero-knowledge proofs to epigenetic clock inference
2. Implement Byzantine fault-tolerant consensus across multiple deep learning aging clocks
3. Construct an HNSW-indexed vector knowledge graph of CpG site embeddings for intervention recommendation
4. Combine all four capabilities into an integrated, verifiable biological age estimation pipeline

---

## 6. Feasibility Assessment

### 6.1 EZKL and ONNX Model Compatibility

**AltumAge** uses a fully connected deep neural network architecture with standard operations (linear layers, ReLU activations, batch normalization), which are well-supported by EZKL's ONNX operator coverage [24, 26].

**DeepStrataAge** employs a similar DNN architecture trained on 12,234 CpG features [5]. The model's moderate size (thousands, not millions, of parameters) places it within EZKL's practical envelope.

**GrimAge** is a composite model computing DNAm surrogates for plasma proteins, then combining them via Cox regression. The individual DNAm surrogate models are compact linear or shallow neural network models, amenable to ZK circuit compilation.

**EpInflammAge** uses deep neural networks optimized for tabular data [6]. The two-stage architecture (cytokine prediction then age estimation) can be serialized as a single ONNX computational graph.

**Key constraint:** EZKL's proving time scales with model complexity. For the moderate-sized models in CHRONOS (thousands of parameters, not millions), estimated proving times are 5--30 seconds per clock with 1--4 GB RAM, based on published benchmarks [28]. The aggregate proof for all four clocks would require approximately 30--120 seconds, acceptable for non-real-time clinical reporting.

### 6.2 HNSW Scalability for CpG Indexing

The Illumina 450K array covers ~485,000 CpG sites; the EPIC array covers ~850,000. HNSW has been benchmarked at sub-millisecond query times on datasets of millions of vectors [32]. For CHRONOS:

- **CpG-level index** (450K--850K vectors, d=256): ~28--50 GB RAM, query time <1ms
- **Patient-level index** (scaling to 100K patients, d=256): ~6.4 GB RAM, query time <0.5ms

These requirements are achievable on modern server hardware (128--256 GB RAM). For larger deployments, partitioned HNSW indices or disk-backed variants (e.g., DiskANN) could be employed.

### 6.3 Raft Consensus Appropriateness

The Raft protocol [39] is well-suited for CHRONOS's multi-clock agreement for several reasons:

- **Small cluster size (N=4):** Raft is optimized for small-to-medium clusters and introduces minimal latency
- **Leader-based coordination:** Aligns with having a designated primary clock (lowest MAE) coordinate consensus
- **Crash fault tolerance:** Can tolerate 1 of 4 clocks failing, maintaining consensus with 3 operational clocks
- **Mature implementations:** Over 100 open-source Raft implementations exist [39]

**Limitation:** Classical Raft tolerates crash faults but not Byzantine (arbitrary) faults. For true Byzantine tolerance with N=4 nodes, the system can tolerate at most f=1 Byzantine clock (since BFT requires N >= 3f+1). This is sufficient for CHRONOS where "Byzantine" behavior corresponds to a clock producing anomalous results due to software bugs or adversarial inputs, not malicious intent. For stronger guarantees, a weighted PBFT variant could be employed at the cost of increased message complexity.

### 6.4 Computational Requirements Summary

| Component | CPU/GPU | RAM | Storage | Latency |
|-----------|---------|-----|---------|---------|
| Data preprocessing | 4 CPU cores | 8 GB | 2 GB/sample | ~30s |
| Multi-clock inference (4x) | 1 GPU or 8 CPU | 4 GB | 500 MB models | ~5s total |
| Raft consensus | 1 CPU core | 256 MB | Negligible | <100ms |
| ZK proof generation (4 clocks) | 8 CPU cores | 4--16 GB | 2--8 GB keys | 30--120s |
| HNSW query | 1 CPU core | 28--50 GB | Index in RAM | <1ms |
| **Total pipeline** | **8+ CPU, 1 GPU** | **64 GB min** | **~60 GB** | **~3 min** |

---

## 7. Implementation Plan

### 7.1 Phase 1: Foundation (Months 1--3)

- Implement methylation data ingestion pipeline with minfi-compatible preprocessing
- Export AltumAge and GrimAge as ONNX models; validate inference parity with original implementations
- Deploy HNSW index with RuVector backend; benchmark with synthetic CpG embeddings
- Establish CI/CD pipeline with automated testing

### 7.2 Phase 2: Multi-Clock Integration (Months 4--6)

- Integrate DeepStrataAge and EpInflammAge ONNX models
- Implement Raft consensus module with configurable weights and tolerance parameters
- Train CpG autoencoder for embedding generation on public GEO datasets
- Validate consensus age against individual clock predictions on holdout data

### 7.3 Phase 3: Zero-Knowledge Proofs (Months 7--10)

- Compile each ONNX clock model to Halo2 circuits via EZKL
- Benchmark proving times and memory usage; optimize circuit parameters
- Implement proof composition for aggregate consensus proof
- Develop verification API and smart contract verifier (optional on-chain component)

### 7.4 Phase 4: Knowledge Graph and Recommendations (Months 11--14)

- Populate vector knowledge graph with public methylation datasets (GEO, TCGA)
- Implement intervention recommendation engine with evidence-based filtering
- Build temporal trajectory tracking for longitudinal studies
- Develop clinical-facing API and visualization dashboard

### 7.5 Phase 5: Validation and Deployment (Months 15--18)

- Clinical validation study comparing CHRONOS consensus age with individual clocks
- Security audit of ZK proof system and privacy guarantees
- Performance optimization and horizontal scaling
- Documentation, open-source release, and regulatory pre-submission preparation

---

## 8. Ethical Considerations and Limitations

### 8.1 Ethical Dimensions

**Genetic privacy.** Although CHRONOS employs zero-knowledge proofs to protect methylation data, the system handles highly sensitive genomic information. Compliance with GINA [10], GDPR, and emerging genetic privacy legislation such as the Texas Genomic Act of 2025 [41] is essential. The Don't Sell My DNA Act introduced in July 2025 [41] signals increasing legislative attention to genomic data protection.

**Equity and bias.** Epigenetic clocks trained predominantly on European-ancestry cohorts may exhibit reduced accuracy in underrepresented populations. GrimAge2 [13] improved cross-ancestry performance, but systematic biases may persist. CHRONOS's multi-clock consensus can partially mitigate individual clock biases, but validation across diverse populations is necessary.

**Clinical responsibility.** Biological age estimates and intervention recommendations must be clearly communicated as research tools, not clinical diagnoses. The system should present uncertainty bounds and flag cases where clock disagreement exceeds acceptable thresholds.

**Insurance and discrimination.** While GINA prohibits genetic discrimination in health insurance and employment, it does not cover life insurance, long-term care, or disability insurance [10]. Verifiable age estimates could potentially be misused in these unprotected domains. System access controls and audit logs must prevent such misuse.

### 8.2 Technical Limitations

**ZK proof overhead.** Proving times of 30--120 seconds, while acceptable for batch processing, preclude real-time clinical use. Future hardware acceleration (GPU-based ZK proving) may reduce this to seconds [26].

**ONNX operator coverage.** EZKL supports approximately 50 of 120+ ONNX operators [26]. Custom layers, exotic normalizations, or dynamic control flow in clock models may require architectural modifications for ZK compatibility.

**Clock evolution.** As new epigenetic clocks are published, integrating them into CHRONOS requires ONNX export, circuit compilation, and Raft reconfiguration. A modular plugin architecture is essential for maintainability.

**HNSW memory requirements.** The 28--50 GB RAM requirement for CpG-level HNSW indices may be prohibitive for smaller institutions. Disk-backed or quantized index variants could address this at the cost of increased query latency.

**Intervention evidence.** Recommendations based on vector similarity in the knowledge graph reflect correlational, not causal, relationships. Intervention effect sizes must be contextualized with appropriate caveats.

---

## 9. Conclusion

CHRONOS addresses a critical gap at the intersection of epigenetic aging science, privacy-preserving computation, and verifiable machine learning. By combining four complementary deep learning clocks with Byzantine fault-tolerant consensus, zero-knowledge proofs, and HNSW-indexed vector knowledge graphs, the system provides robust, verifiable, and privacy-preserving biological age estimates with personalized intervention recommendations.

The technical feasibility assessment confirms that current ZKML frameworks (EZKL/Halo2), vector indexing algorithms (HNSW), and consensus protocols (Raft) are mature enough to support the proposed architecture, though computational overhead for ZK proof generation remains a practical constraint. The competitive landscape analysis reveals that CHRONOS occupies a unique position: no existing system combines verifiable epigenetic clock inference with multi-clock consensus and privacy-preserving genomic computation.

As biological age increasingly serves as a surrogate endpoint in longevity clinical trials [8, 9], a regulatory biomarker [11], and a tool for personalized medicine, the need for cryptographically verifiable, privacy-preserving age estimation will only grow. CHRONOS provides a principled architectural blueprint for meeting this need.

---

## 10. References

[1] Horvath, S. and Raj, K. "DNA methylation-based biomarkers and the epigenetic clock theory of ageing." *Nature Reviews Genetics*, 19(6), 371--384, 2018.

[2] Biomarkers of Aging Consortium. "Recommendations for biomarker data collection in clinical trials by longevity biotechnology companies." *npj Aging*, 2025. https://www.nature.com/articles/s41514-025-00313-1

[3] Horvath, S. "DNA methylation age of human tissues and cell types." *Genome Biology*, 14(10), R115, 2013.

[4] de Lima Camillo, L.P., Lapierre, L.R., and Singh, R. "A pan-tissue DNA-methylation epigenetic clock based on deep learning." *npj Aging*, 8, 4, 2022. https://www.nature.com/articles/s41514-022-00085-y

[5] DeepStrataAge Authors. "DeepStrataAge: an interpretable deep-learning clock that reveals stage- and sex-divergent DNA methylation aging dynamics." *npj Aging*, 2026. https://www.nature.com/articles/s41514-026-00358-w

[6] EpInflammAge Authors. "EpInflammAge: Epigenetic-Inflammatory Clock for Disease-Associated Biological Aging Based on Deep Learning." *International Journal of Molecular Sciences*, 26(13), 6284, 2025. https://www.mdpi.com/1422-0067/26/13/6284

[7] Deep Aging Clocks Review. "Deep aging clocks: AI-powered strategies for biological age estimation." *Ageing Research Reviews*, 2025. https://www.sciencedirect.com/science/article/pii/S1568163725002351

[8] Biomarkers of Aging Consortium. "Recommendations for biomarker data collection in clinical trials by longevity biotechnology companies." *npj Aging*, 2025. https://www.nature.com/articles/s41514-025-00313-1

[9] "Do we actually need aging clocks?" *npj Aging*, 2025. https://www.nature.com/articles/s41514-025-00312-2

[10] "The Genetic Information Nondiscrimination Act (GINA)." National Human Genome Research Institute. https://www.genome.gov/genetics-glossary/Genetic-Information-Nondiscrimination-Act-GINA

[11] Life Biosciences. "Life Biosciences Announces FDA Clearance of IND Application for ER-100 in Optic Neuropathies." January 28, 2026. https://www.lifebiosciences.com/life-biosciences-announces-fda-clearance-of-ind-application-for-er-100-in-optic-neuropathies/

[12] Lu, A.T., et al. "DNA methylation GrimAge strongly predicts lifespan and healthspan." *Aging*, 11(2), 303--327, 2019.

[13] Lu, A.T., et al. "DNA methylation GrimAge version 2." *Aging*, 14(23), 9484--9549, 2022. https://www.aging-us.com/article/204434/text

[14] Nadkarni, G.N., et al. "Orchestrated multi agents sustain accuracy under clinical-scale workloads compared to a single agent." *npj Health Systems*, March 2026. https://www.mountsinai.org/about/newsroom/2026/orchestrated-multi-agent-ai-systems-outperforms-single-agents-in-health-care

[15] de Lima Camillo, L.P. "pyaging: a Python-based compendium of GPU-optimized aging clocks." *Bioinformatics*, 40(4), btae200, 2024. https://academic.oup.com/bioinformatics/article/40/4/btae200/7644282

[16] "GrimAge and GrimAge2 Age Acceleration effectively predict mortality risk: a retrospective cohort study." *Epigenetics*, 2025. https://www.tandfonline.com/doi/full/10.1080/15592294.2025.2530618

[17] Mualem, L., et al. "Privacy-preserving biological age prediction over federated human methylation data using fully homomorphic encryption." *Genome Research*, 34(9), 1324, 2024. https://genome.cshlp.org/content/34/9/1324.short

[18] "Privacy-preserving framework for genomic computations via multi-key homomorphic encryption." *Bioinformatics*, 41(3), btae754, 2025. https://academic.oup.com/bioinformatics/article/41/3/btae754/7994464

[19] "Privacy-preserving federated unsupervised domain adaptation with application to age prediction from DNA methylation data." 2024. https://arxiv.org/html/2411.17287v1

[20] "Ethical AI in Healthcare: Integrating Zero-Knowledge Proofs and Smart Contracts for Transparent Data Governance." *PMC*, 2025. https://pmc.ncbi.nlm.nih.gov/articles/PMC12650700/

[21] "Zero-knowledge proofs for anonymous authentication of patients on public and private blockchains." *ScienceDirect*, 2025. https://www.sciencedirect.com/science/article/pii/S2590005625002176

[22] "A Decentralized-Based Blockchain Architecture with Integrated Zero Knowledge Proof for Genomic Data Sharing." *Blockchain in Healthcare Today*, 2024. https://blockchainhealthcaretoday.com/index.php/journal/article/view/419

[23] "Byzantine Fault-Tolerant Multi-Agent System for Healthcare: A Gossip Protocol Approach to Secure Medical Message Propagation." arXiv:2512.17913, 2025. https://arxiv.org/html/2512.17913v1

[24] EZKL. "ezkl is an engine for doing inference for deep learning models and other computational graphs in a zk-snark (ZKML)." https://github.com/zkonduit/ezkl

[25] Zcash. "The Halo2 zero-knowledge proving system." https://github.com/zcash/halo2

[26] "The Definitive Guide to ZKML (2025)." ICME Blog. https://blog.icme.io/the-definitive-guide-to-zkml-2025/

[27] Peng, Y. and Wang, X. "A Survey of Zero-Knowledge Proof Based Verifiable Machine Learning." arXiv:2502.18535, February 2025. https://arxiv.org/abs/2502.18535

[28] "Benchmarking ZKML Frameworks." EZKL Blog. https://blog.ezkl.xyz/post/benchmarks/

[29] "EvoMDT: a self-evolving multi-agent system for structured clinical decision-making in multi-cancer." *npj Digital Medicine*, 2025. https://www.nature.com/articles/s41746-025-02304-8

[30] "MedBeads: An Agent-Native, Immutable Data Substrate for Trustworthy Medical AI." arXiv:2602.01086, 2026. https://arxiv.org/abs/2602.01086

[31] "Biomedical Knowledge Graph: A Survey of Domains, Tasks, and Real-World Applications." arXiv:2501.11632, 2025. https://arxiv.org/pdf/2501.11632

[32] Malkov, Y.A. and Yashunin, D.A. "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs." *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824--836, 2020. https://en.wikipedia.org/wiki/Hierarchical_navigable_small_world

[33] "CpGPT: a Foundation Model for DNA Methylation." *bioRxiv*, 2024. https://www.biorxiv.org/content/10.1101/2024.10.24.619766v1.full

[34] Levy, J.J., et al. "MethylNet: an automated and modular deep learning approach for DNA methylation analysis." *BMC Bioinformatics*, 21, 137, 2020. https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-020-3443-8

[35] "mEthAE: an Explainable AutoEncoder for methylation data." *bioRxiv*, 2023. https://www.biorxiv.org/content/10.1101/2023.07.18.549496v1.full

[36] Fortin, J.P., et al. "Preprocessing, normalization and integration of the Illumina HumanMethylationEPIC array with minfi." *Bioinformatics*, 33(4), 558--560, 2017. https://academic.oup.com/bioinformatics/article/33/4/558/2666344

[37] Maksimovic, J., et al. "A data-driven approach to preprocessing Illumina 450K methylation array data." *BMC Genomics*, 14, 293, 2013. https://link.springer.com/article/10.1186/1471-2164-14-293

[38] "An effective processing pipeline for harmonizing DNA methylation data from Illumina's 450K and EPIC platforms." *BMC Research Notes*, 2021. https://bmcresnotes.biomedcentral.com/articles/10.1186/s13104-021-05741-2

[39] Ongaro, D. and Ousterhout, J. "In Search of an Understandable Consensus Algorithm." In *Proceedings of USENIX ATC*, 2014. https://raft.github.io/

[40] "zkPyTorch: A Hierarchical Optimized Compiler for Zero-Knowledge Proofs of Deep Learning." *IACR ePrint*, 2025/535. https://eprint.iacr.org/2025/535.pdf

[41] "Navigating Privacy Gaps and New Legal Requirements for Companies Processing Genetic Data." Orrick, August 2025. https://www.orrick.com/en/Insights/2025/08/Navigating-Privacy-Gaps-and-New-Legal-Requirements-for-Companies-Processing-Genetic-Data

[42] "Genomic privacy and security in the era of artificial intelligence and quantum computing." *Discover Computing*, 2025. https://link.springer.com/article/10.1007/s10791-025-09627-w

[43] "Verifiable evaluations of machine learning models using zkSNARKs." arXiv:2402.02675, 2024. https://arxiv.org/html/2402.02675v2

[44] Angermueller, C., et al. "DeepCpG: accurate prediction of single-cell DNA methylation states using deep learning." *Genome Biology*, 18, 67, 2017. https://genomebiology.biomedcentral.com/articles/10.1186/s13059-017-1189-z

[45] "A Byzantine Fault Tolerance Approach towards AI Safety." arXiv:2504.14668, 2025. https://www.arxiv.org/pdf/2504.14668

[46] "Leveraging blockchain with zero knowledge proofs in wearable health technologies for personalized healthcare." *Scientific Reports*, 2025. https://www.nature.com/articles/s41598-025-25146-6

[47] "Zero-knowledge machine learning models for blockchain peer-to-peer energy trading." *ScienceDirect*, 2025. https://www.sciencedirect.com/science/article/pii/S2542660525001520

[48] "ZKML: Verifiable Machine Learning using Zero-Knowledge Proof." Kudelski Security, 2025. https://kudelskisecurity.com/modern-ciso-blog/zkml-verifiable-machine-learning-using-zero-knowledge-proof
