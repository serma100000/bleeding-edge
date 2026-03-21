# CHRONOS: Domain-Driven Design — Bounded Contexts

**Date:** 2026-03-21

---

## Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHRONOS SYSTEM                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  METHYLATION  │───>│    CLOCK     │───>│   PROOF      │      │
│  │   CONTEXT     │    │   CONTEXT    │    │   CONTEXT    │      │
│  │              │    │              │    │              │      │
│  │ src/methyl/  │    │ src/clocks/  │    │ src/proofs/  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘      │
│         │                   │                                   │
│         v                   v                                   │
│  ┌──────────────┐    ┌──────────────┐                          │
│  │  KNOWLEDGE    │<───│ ORCHESTRATION│                          │
│  │   CONTEXT     │    │   CONTEXT    │                          │
│  │              │    │              │                          │
│  │ src/knowledge│    │ src/orchest/ │                          │
│  └──────────────┘    └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Relationship Types

| From | To | Relationship | Integration |
|------|----|-------------|-------------|
| Methylation | Clock | **Upstream/Downstream** | Methylation provides beta-value vectors consumed by clocks |
| Clock | Proof | **Upstream/Downstream** | Clock ONNX models + consensus result consumed by proof engine |
| Methylation | Knowledge | **Upstream/Downstream** | Embeddings flow into knowledge graph |
| Orchestration | All | **Conformist** | Orchestration conforms to each context's API |
| Knowledge | Clock | **Shared Kernel** | Both reference CpG site identifiers and aging phase taxonomy |

---

## 1. Methylation Context (`src/methylation/`)

### Responsibility
Ingest, validate, normalize, and embed DNA methylation array data.

### Domain Language
- **Beta value**: Methylation ratio [0,1] at a CpG site
- **CpG site**: Cytosine-Guanine dinucleotide locus, identified by probe ID (e.g., cg00000029)
- **Array type**: Illumina platform (450K, EPIC, EPIC v2)
- **ssNoob**: Single-sample noob normalization method
- **Probe QC**: Detection p-value filtering

### Aggregates

**MethylationSample** (Aggregate Root)
- sampleId: string
- subjectId: string
- arrayType: ArrayType
- cpgSites: Map<ProbeId, BetaValue>
- metadata: SampleMetadata
- qcMetrics: QualityMetrics

### Domain Events
- `MethylationSampleIngested` — raw data parsed and validated
- `MethylationSampleNormalized` — ssNoob applied
- `MethylationSampleFailed` — QC thresholds not met
- `CpGEmbeddingGenerated` — autoencoder produced d=256 embedding

### Key Interfaces
```typescript
interface MethylationParser {
  parse(input: Buffer | string, format: InputFormat): MethylationSample;
}

interface CpGEmbedder {
  embed(sample: MethylationSample): Float32Array; // d=256
}

interface MethylationStore {
  store(sample: MethylationSample, embedding: Float32Array): void;
  findSimilar(embedding: Float32Array, k: number): SimilarSample[];
}
```

---

## 2. Clock Context (`src/clocks/`)

### Responsibility
Execute epigenetic clock models and produce age predictions with confidence scores.

### Domain Language
- **Clock**: A trained model that maps methylation → biological age
- **Age acceleration**: biological_age - chronological_age
- **MAE**: Mean Absolute Error — clock's accuracy on calibration data
- **ONNX model**: Portable neural network format for cross-platform inference

### Aggregates

**ClockResult** (Value Object)
- clockName: ClockName
- biologicalAge: number
- chronologicalAge: number
- ageAcceleration: number
- confidence: number
- topContributingCpGs: CpGContribution[]
- modelHash: string (SHA-256 of ONNX file)

**ConsensusAge** (Aggregate Root)
- consensusBiologicalAge: number
- clockResults: ClockResult[]
- consensusMethod: 'raft' | 'weighted_average'
- tolerance: number (epsilon)
- committedClocks: number (how many agreed)
- confidenceInterval: [number, number]
- agingVelocity?: number

### Domain Events
- `ClockInferenceCompleted` — single clock produced result
- `ConsensusReached` — 3+ clocks agreed within epsilon
- `ConsensusFailed` — fewer than 3 clocks agreed (manual review)
- `ClockWeightsUpdated` — hooks intelligence adjusted weights

### Key Interfaces
```typescript
interface EpigeneticClock {
  name: ClockName;
  predict(beta: Map<ProbeId, BetaValue>): ClockResult;
  getOnnxModel(): Buffer;
  getModelHash(): string;
}

interface ClockRegistry {
  register(clock: EpigeneticClock): void;
  getAll(): EpigeneticClock[];
  getByName(name: ClockName): EpigeneticClock;
}

interface ClockConsensus {
  computeConsensus(results: ClockResult[]): ConsensusAge;
}
```

---

## 3. Proof Context (`src/proofs/`)

### Responsibility
Compile clock models to ZK circuits, generate proofs of correct computation, and verify proofs.

### Domain Language
- **Circuit**: Halo2 arithmetic circuit compiled from ONNX model
- **Witness**: Private input (methylation data) to the circuit
- **Proof (pi)**: ZK-SNARK attestation of correct computation
- **Verification key (vk)**: Public key for proof verification
- **Proving key (pk)**: Secret key for proof generation
- **Public signals**: Publicly visible outputs (age, model hash, timestamp)

### Aggregates

**AgeProof** (Aggregate Root)
- proofBytes: Uint8Array
- publicSignals: { biologicalAge, modelHash, timestamp }
- verificationKey: Uint8Array
- circuitHash: string
- provingTimeMs: number

### Domain Events
- `CircuitCompiled` — ONNX model converted to Halo2 circuit
- `ProofGenerated` — ZK proof created successfully
- `ProofVerified` — third-party verification succeeded
- `ProofFailed` — proof generation or verification failed

### Key Interfaces
```typescript
interface CircuitCompiler {
  compile(onnxModel: Buffer): CompiledCircuit;
  getCircuitHash(circuit: CompiledCircuit): string;
}

interface ProofGenerator {
  generateProof(circuit: CompiledCircuit, witness: MethylationWitness): AgeProof;
}

interface ProofVerifier {
  verify(proof: AgeProof): boolean;
}
```

---

## 4. Knowledge Context (`src/knowledge/`)

### Responsibility
Store, query, and reason over the aging knowledge graph — CpG embeddings, pathways, interventions, and temporal trajectories.

### Domain Language
- **Aging trajectory**: Sequence of biological age measurements over time
- **Age acceleration**: Rate of biological aging relative to chronological
- **Intervention**: Action associated with reduced age acceleration
- **CpG pathway**: Causal chain from CpG site → gene → pathway → aging phase

### Aggregates

**AgingProfile** (Aggregate Root)
- subjectId: string
- trajectoryPoints: { timestamp, consensusAge, embedding }[]
- agingVelocity: number (d(bio_age)/dt)
- interventions: AppliedIntervention[]
- recommendations: InterventionRecommendation[]

### Domain Events
- `TrajectoryPointAdded` — new measurement indexed
- `AgingVelocityComputed` — longitudinal rate calculated
- `InterventionRecommended` — vector similarity found relevant interventions
- `AnomalyDetected` — sudden trajectory deviation flagged

### Key Interfaces
```typescript
interface AgingKnowledgeGraph {
  addCpGPathway(cpg: ProbeId, gene: string, pathway: string): void;
  queryCausalChain(cpg: ProbeId): CausalChain[];
  findSimilarProfiles(embedding: Float32Array, k: number): AgingProfile[];
}

interface InterventionRecommender {
  recommend(profile: AgingProfile, k: number): InterventionRecommendation[];
}

interface TemporalTracker {
  addTimepoint(subjectId: string, age: ConsensusAge, embedding: Float32Array): void;
  getVelocity(subjectId: string): number;
  detectAnomaly(subjectId: string): boolean;
}
```

---

## 5. Orchestration Context (`src/orchestration/`)

### Responsibility
Coordinate the multi-agent swarm, manage the end-to-end pipeline, and expose external APIs.

### Domain Language
- **Swarm**: Collection of 8 specialized agents
- **Pipeline run**: Single end-to-end execution for one methylation sample
- **Hooks**: Pre/post task intelligence that learns optimal parameters

### Aggregates

**PipelineRun** (Aggregate Root)
- runId: string
- sampleId: string
- status: 'ingesting' | 'inferring' | 'consensus' | 'proving' | 'indexing' | 'complete' | 'failed'
- startedAt: Date
- completedAt?: Date
- methylationSample: MethylationSample
- clockResults: ClockResult[]
- consensusAge?: ConsensusAge
- proof?: AgeProof
- recommendations?: InterventionRecommendation[]

### Key Interfaces
```typescript
interface ChronosSwarm {
  initialize(): Promise<void>;
  runPipeline(sample: MethylationSample): Promise<PipelineRun>;
  getStatus(runId: string): PipelineRun;
}

interface ChronosAPI {
  submitSample(input: Buffer, format: InputFormat): Promise<string>; // returns runId
  getResult(runId: string): Promise<PipelineRun>;
  verifyProof(proof: AgeProof): Promise<boolean>;
  queryKnowledgeGraph(query: string): Promise<any>;
}
```

---

## Anti-Corruption Layers

| Boundary | ACL Purpose |
|----------|-------------|
| Methylation → Clock | Translate `MethylationSample` to clock-specific input format (each clock expects different CpG subsets) |
| Clock → Proof | Serialize clock ONNX models + consensus result into EZKL-compatible witness format |
| Any → RuVector | Translate domain objects to/from RuVector's RVF format and graph query language |
| Any → ruflo | Map domain events to ruflo hooks and agent task definitions |
