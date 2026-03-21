# ADR-004: Agent Orchestration Strategy

**Status:** Accepted
**Date:** 2026-03-21
**Context:** CHRONOS Multi-Agent Pipeline

## Context

CHRONOS runs a complex pipeline: data ingestion, 4 parallel clock inferences, consensus, ZK proof generation, knowledge graph updates, and intervention recommendations. These stages have different compute profiles and dependencies.

## Decision

Use **ruflo v3** with a **hierarchical swarm topology** of 8 specialized agents.

### Agent Definitions

| Agent | Role | Compute Profile | Dependencies |
|-------|------|-----------------|-------------|
| `clock-coordinator` | Leader — orchestrates pipeline, manages Raft | Low CPU | None (root) |
| `altumage-agent` | Run AltumAge ONNX inference | GPU or 2 CPU | Methylation data |
| `grimage-agent` | Run GrimAge inference | GPU or 2 CPU | Methylation data |
| `deepstrataage-agent` | Run DeepStrataAge inference | GPU or 2 CPU | Methylation data |
| `epinflamm-agent` | Run EpInflammAge inference | GPU or 2 CPU | Methylation + inflammatory markers |
| `zk-prover-agent` | Compile circuits, generate proofs | 8 CPU, 16 GB RAM | Consensus result + ONNX models |
| `vector-indexer-agent` | Generate embeddings, update HNSW index | 4 CPU, 32 GB RAM | Methylation data |
| `consensus-reporter-agent` | Run Raft consensus, produce final report | Low CPU | All clock outputs |

### Topology

```
                clock-coordinator (leader)
               /    |       |       \
        altumage  grimage  deepstrata  epinflamm
              \     |       |       /
            consensus-reporter-agent
                   /           \
          zk-prover-agent    vector-indexer-agent
```

### Swarm Configuration

```bash
npx ruflo swarm init \
  --topology hierarchical \
  --max-agents 8 \
  --strategy specialized \
  --consensus raft
```

### Execution Flow

1. `clock-coordinator` receives methylation sample, broadcasts to 4 clock agents
2. Clock agents run inference in parallel, report results to coordinator
3. `consensus-reporter-agent` runs weighted Raft consensus
4. In parallel:
   - `zk-prover-agent` generates aggregate ZK proof
   - `vector-indexer-agent` embeds and indexes the sample
5. `clock-coordinator` assembles final output

### Hooks Integration

- **pre-task hook:** Validate methylation data format and quality
- **post-task hook:** Log consensus result + proof hash to audit trail
- **intelligence hooks:** Learn optimal clock weights over time via trajectory tracking

## Alternatives Considered

1. **Single monolithic pipeline** — No parallelism, no fault isolation
2. **Mesh topology** — Unnecessary for 8 agents with clear hierarchy
3. **Adaptive topology** — Overhead not justified for a fixed pipeline
4. **External orchestrator (Airflow/Prefect)** — Extra dependency; ruflo is already in the stack

## Consequences

- **Positive:** 4 clocks run in parallel (~4x speedup); fault isolation per agent; hooks learn from every run; clean separation of concerns
- **Negative:** 8 agents consume more memory than monolithic; inter-agent communication adds latency; ruflo daemon must be running
