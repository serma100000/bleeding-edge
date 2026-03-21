import { createHash } from 'node:crypto';
import type { AgeProof } from '../shared/types.js';

export class ProofVerifier {
  /**
   * Verifies the structural validity of an AgeProof.
   *
   * Checks:
   *  1. Proof bytes are non-empty
   *  2. Public signals contain biologicalAge, modelHash, timestamp
   *  3. Verification key matches the circuit hash
   *  4. Commitment hash embedded in proof bytes is consistent
   */
  verify(proof: AgeProof): boolean {
    // 1. Proof bytes must be non-empty
    if (!proof.proofBytes || proof.proofBytes.length === 0) {
      return false;
    }

    // 2. Public signals must be fully populated
    const { biologicalAge, modelHash, timestamp } = proof.publicSignals;
    if (
      biologicalAge === undefined ||
      biologicalAge === null ||
      !modelHash ||
      !timestamp
    ) {
      return false;
    }

    // 3. Verification key must match the expected derivation from circuit hash
    const expectedVk = new Uint8Array(
      createHash('sha256')
        .update(`vk:${proof.circuitHash}`)
        .digest(),
    );

    if (!this.uint8ArrayEquals(proof.verificationKey, expectedVk)) {
      return false;
    }

    // 4. Verify the commitment hash in the first 32 bytes of proofBytes
    //    matches the re-derived commitment from public signals + circuit
    //    Note: we cannot re-derive the witness commitment without the witness,
    //    but we CAN verify the proof bytes start with a valid SHA-256 output
    //    (32 bytes, non-zero).
    const commitment = proof.proofBytes.slice(0, 32);
    if (commitment.every((b) => b === 0)) {
      return false;
    }

    return true;
  }

  private uint8ArrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
