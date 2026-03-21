# ADR-001: Multi-Clock Consensus Architecture

**Status:** Accepted
**Date:** 2026-03-21
**Context:** CHRONOS System Design

## Context

CHRONOS must compute biological age from DNA methylation data. Individual epigenetic clocks exhibit systematic biases: AltumAge underestimates in elderly populations, GrimAge captures mortality risk rather than chronological aging, DeepStrataAge is EPIC-array-specific, and EpInflammAge requires inflammatory markers. No single clock is universally optimal.

Mount Sinai's 2026 study demonstrated multi-agent medical AI systems outperform single agents by up to 65x efficiency [Nadkarni et al., npj Health Systems, 2026].

## Decision

Implement a **Raft-based consensus protocol** across four parallel epigenetic clocks, where each clock operates as a node in a 4-node Raft cluster.

### Clock Selection

| Clock | Dimension | MAE | Array Support |
|-------|-----------|-----|---------------|
| AltumAge | Chronological (pan-tissue) | ~2.5 yr | 450K, EPIC |
| GrimAge | Mortality risk | ~3.5 yr | 450K, EPIC |
| DeepStrataAge | Non-linear dynamics | 1.89 yr | EPIC v1/v2 |
| EpInflammAge | Inflammaging | 7.0 yr | 450K, EPIC |

### Consensus Mechanism

- **Leader election:** Clock with lowest historical MAE (DeepStrataAge) is initial leader
- **Weighted voting:** `w_k = 1 / MAE_k`
- **Consensus formula:** `a_consensus = sum(w_k * a_k) / sum(w_k)`
- **Commitment rule:** At least 3 of 4 clocks must agree within epsilon tolerance
- **Failure mode:** If <3 agree, flag for manual review

### Fault Tolerance

- N=4, tolerates f=1 crash fault (Raft) or f=1 Byzantine fault (3f+1)
- "Byzantine" = clock producing anomalous results due to bugs, data quality, or adversarial input

## Alternatives Considered

1. **Simple averaging** — No fault tolerance, outlier clocks corrupt result
2. **Median** — Robust to outliers but discards confidence information
3. **PBFT** — Overkill for 4 nodes; message complexity O(n^2) unnecessary
4. **Weighted average without consensus** — No disagreement detection

## Consequences

- **Positive:** Robust to individual clock failures; disagreement detection identifies pathological aging patterns; weighted approach leverages complementary clock strengths
- **Negative:** Raft adds latency (~100ms); requires all 4 clocks to be ONNX-exportable; clock weight learning adds complexity
- **Risk:** If 2+ clocks systematically bias in the same direction, consensus inherits the bias
