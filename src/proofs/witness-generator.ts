import type { MethylationSample, MethylationWitness, ProbeId } from '../shared/types.js';

/** Fixed-point scale factor: 2^16 for 16-bit precision */
const QUANTIZATION_SCALE = 2 ** 16;

export class WitnessGenerator {
  /**
   * Generates a MethylationWitness by extracting and quantizing the beta
   * values for the specified probe subset from a methylation sample.
   */
  generateWitness(
    sample: MethylationSample,
    probeSubset: string[],
  ): MethylationWitness {
    if (!probeSubset.length) {
      throw new Error('Probe subset must not be empty');
    }

    const matchedProbeIds: ProbeId[] = [];
    const rawValues: number[] = [];

    for (const probeId of probeSubset) {
      const beta = sample.cpgSites.get(probeId);
      if (beta === undefined) {
        throw new Error(
          `Probe ${probeId} not found in sample ${sample.sampleId}`,
        );
      }
      matchedProbeIds.push(probeId);
      rawValues.push(beta);
    }

    // Quantize to fixed-point representation
    const quantized = new Float32Array(rawValues.length);
    for (let i = 0; i < rawValues.length; i++) {
      quantized[i] = Math.round(rawValues[i] * QUANTIZATION_SCALE);
    }

    return {
      betaValues: quantized,
      probeIds: matchedProbeIds,
      quantizationScale: QUANTIZATION_SCALE,
    };
  }
}
