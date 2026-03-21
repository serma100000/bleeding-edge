# ADR-003: Vector Knowledge Graph Architecture

**Status:** Accepted
**Date:** 2026-03-21
**Context:** CHRONOS Knowledge Storage and Retrieval

## Context

CHRONOS needs to:
1. Store high-dimensional CpG site embeddings for similarity search
2. Maintain causal relationships between CpG sites, aging pathways, and interventions
3. Track temporal aging trajectories per patient
4. Support sub-millisecond queries for intervention recommendations

Existing epigenetic tools are single-pipeline scripts with no searchable knowledge layer.

## Decision

Use **RuVector** as the unified vector knowledge graph backend, leveraging:

- **HNSW indexing** for CpG and patient embeddings
- **Graph queries (Cypher/SPARQL)** for causal pathway relationships
- **Brain/page system** for structured knowledge management
- **Temporal drift tracking** for longitudinal analysis
- **RVF format** for persistent, compact vector storage

### Index Architecture

| Index | Vectors | Dimensions | Memory | Query Time |
|-------|---------|-----------|--------|-----------|
| CpG-level | 450K-850K | d=256 | 28-50 GB | <1ms |
| Patient-level | scaling to 100K | d=256 | ~6.4 GB | <0.5ms |
| Intervention-level | ~10K | d=256 | ~640 MB | <0.1ms |

### HNSW Parameters

- **M** (max connections per layer): 16
- **efConstruction**: 200
- **efSearch**: 100
- **Distance metric**: Cosine similarity

### Graph Schema (Cypher)

```cypher
(CpGSite)-[:METHYLATED_IN]->(Sample)
(CpGSite)-[:REGULATES]->(Gene)
(Gene)-[:INVOLVED_IN]->(Pathway)
(Pathway)-[:ASSOCIATED_WITH]->(AgingPhase)
(Patient)-[:HAS_SAMPLE]->(Sample)
(Sample)-[:PREDICTED_AGE {clock, value, confidence}]->(AgeResult)
(Intervention)-[:REDUCES_ACCELERATION {effect_size}]->(AgingPattern)
```

## Alternatives Considered

1. **Pinecone/Weaviate/Qdrant** — Cloud-hosted, no graph query support, data leaves the system (privacy violation for genomic data)
2. **Neo4j + separate vector DB** — Two systems to maintain; no unified query layer
3. **PostgreSQL + pgvector** — Limited HNSW performance at scale; no native graph queries
4. **Custom FAISS + NetworkX** — No persistence, no unified API, brittle

## Consequences

- **Positive:** Unified vector + graph in one system; data never leaves the system (privacy); RuVector MCP integration with ruflo agent orchestration; Cypher queries for causal reasoning
- **Negative:** 28-50 GB RAM for CpG-level index requires dedicated server; RuVector submodule must be kept in sync with upstream
- **Migration path:** If scale exceeds single-node, RuVector supports clustering via `ruvector-cluster` and `ruvector-raft` crates
