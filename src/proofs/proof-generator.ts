import { createHash, randomBytes } from 'node:crypto';
import type { AgeProof, CompiledCircuit, MethylationWitness } from '../shared/types.js';

/** Target proof size in bytes (~10 KB) */
const TARGET_PROOF_SIZE = 10_240;

export class ProofGenerator {
  /**
   * Simulates ZK-SNARK proof generation.
   *
   * Produces a structurally correct (but not cryptographically real) proof
   * that encodes:
   *  - A commitment to the witness data
   *  - The public output (biological age)
   *  - The circuit hash linking proof to model
   */
  generateProof(
    circuit: CompiledCircuit,
    witness: MethylationWitness,
    biologicalAge: number,
  ): AgeProof {
    const startTime = performance.now();

    const timestamp = Date.now();

    // Build witness commitment: hash of quantized beta values
    const witnessBuffer = Buffer.from(witness.betaValues.buffer);
    const witnessCommitment = createHash('sha256')
      .update(witnessBuffer)
      .digest('hex');

    // Build proof payload: commitment + public signals + circuit binding
    const proofPayload = createHash('sha256')
      .update(witnessCommitment)
      .update(circuit.circuitHash)
      .update(String(biologicalAge))
      .update(String(timestamp))
      .digest();

    // Pad proof to realistic size (~10 KB)
    const padding = randomBytes(TARGET_PROOF_SIZE - proofPayload.length);
    const proofBytes = new Uint8Array(
      Buffer.concat([proofPayload, padding]),
    );

    const provingTimeMs = performance.now() - startTime;

    return {
      proofBytes,
      publicSignals: {
        biologicalAge,
        modelHash: circuit.onnxModelHash,
        timestamp,
        consensusMethod: 'raft',
      },
      verificationKey: circuit.verificationKey,
      circuitHash: circuit.circuitHash,
      provingTimeMs,
      proofSizeBytes: proofBytes.length,
    };
  }
}
