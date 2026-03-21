# ADR-002: Zero-Knowledge Proof Pipeline

**Status:** Accepted
**Date:** 2026-03-21
**Context:** CHRONOS Verifiable Computation

## Context

CHRONOS must prove that a biological age prediction was computed correctly from a specific methylation sample without revealing the underlying genomic data. This serves:

1. **Clinical trials:** Regulatory bodies need verifiable computation for ER-100 de-aging therapy endpoints
2. **Insurance:** GINA protects genetic info but verification without disclosure strengthens protections
3. **Trust:** Labs currently say "your biological age is 45" — no way to verify

## Decision

Use **EZKL + Halo2** to compile each clock's ONNX model into a ZK-SNARK circuit and generate proofs of correct inference.

### Pipeline

```
ONNX Clock Model
    |
    v
[EZKL gen-settings] --> circuit settings (quantization params)
    |
    v
[EZKL compile-circuit] --> Halo2 arithmetic circuit
    |
    v
[EZKL setup] --> proving key (pk) + verification key (vk)
    |
    v
[EZKL prove(pk, methylation_witness)] --> proof (pi)
    |
    v
[EZKL verify(vk, public_output, pi)] --> true/false
```

### Proof Statement

For private witness `beta` (methylation vector) and public output `a_consensus`:

```
Verify(vk, a_consensus, pi) = 1
  iff exists beta such that
    a_consensus = RaftConsensus(C1(beta), C2(beta), C3(beta), C4(beta))
```

### Proof Composition

Individual clock proofs are composed into a single aggregate proof via Halo2 accumulation:

```
pi_aggregate = Accumulate(pi_C1, pi_C2, pi_C3, pi_C4, pi_raft)
```

### Performance Estimates (from EZKL benchmarks)

| Metric | Per Clock | Aggregate (4 clocks) |
|--------|-----------|---------------------|
| Proving time | 5-30s | 30-120s |
| RAM | 1-4 GB | 4-16 GB |
| Proof size | ~10 KB | ~40 KB |
| Verification time | <1s | <2s |

## Alternatives Considered

1. **Fully Homomorphic Encryption (FHE)** — Higher computation overhead (10-1000x), requires trusted third party. Mualem et al. showed it works but doesn't scale to DNN clocks.
2. **Secure Multi-Party Computation (SMPC)** — Requires interactive protocol between parties; not suitable for offline verification.
3. **Trusted Execution Environments (TEE)** — Hardware-dependent, side-channel vulnerabilities (cache-timing, speculative execution). Recent research shows TEE gradient leaks even with crypto defenses.
4. **zkPyTorch** — Research prototype only; not production-ready like EZKL.

## Consequences

- **Positive:** No trusted third party; proof is non-interactive and publicly verifiable; Halo2 has no trusted setup ceremony; proofs are small (~40KB)
- **Negative:** 30-120s proving time precludes real-time use; EZKL supports ~50 of 120+ ONNX ops (may need model modifications); quantization to fixed-point may introduce small accuracy loss
- **Constraint:** Clock models must use only EZKL-supported ONNX operators (linear, ReLU, batch norm, sigmoid — all supported; softmax, layer norm — may need workarounds)
