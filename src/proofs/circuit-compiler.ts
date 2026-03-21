import { createHash, randomBytes } from 'node:crypto';
import type { CompiledCircuit } from '../shared/types.js';

const DEFAULT_SUPPORTED_OPS = [
  'MatMul',
  'Relu',
  'Sigmoid',
  'BatchNormalization',
  'Add',
  'Softmax',
  'Conv',
  'Gemm',
  'Reshape',
  'Flatten',
];

export class CircuitCompiler {
  /**
   * Compiles an ONNX model buffer into a simulated ZK circuit.
   *
   * Since EZKL is a Python/Rust tool, this wraps the concept with a
   * simulation layer. The "compilation" simulates:
   *  - Quantizing weights to fixed-point representation
   *  - Generating a deterministic circuit hash
   *  - Producing mock proving and verification keys
   */
  compile(onnxModelBuffer: Buffer): CompiledCircuit {
    if (!onnxModelBuffer || onnxModelBuffer.length === 0) {
      throw new Error('ONNX model buffer must be non-empty');
    }

    const startTime = performance.now();

    // Hash the model to get a deterministic identifier
    const onnxModelHash = createHash('sha256')
      .update(onnxModelBuffer)
      .digest('hex');

    // Simulate circuit bytes by hashing the model with a domain separator
    const circuitBytes = new Uint8Array(
      createHash('sha256')
        .update(`circuit:${onnxModelHash}`)
        .digest()
    );

    const circuitHash = createHash('sha256')
      .update(circuitBytes)
      .digest('hex');

    // Derive proving key deterministically from circuit hash
    const provingKeyData = createHash('sha256')
      .update(`pk:${circuitHash}`)
      .digest();
    const provingKey = new Uint8Array(
      Buffer.concat([provingKeyData, randomBytes(224)])
    ); // 256 bytes

    // Derive verification key deterministically from circuit hash
    const verificationKey = new Uint8Array(
      createHash('sha256')
        .update(`vk:${circuitHash}`)
        .digest()
    );

    const compilationTimeMs = performance.now() - startTime;

    // Detect supported ops from the model (simulated scan)
    const supportedOps = this.detectSupportedOps(onnxModelBuffer);

    return {
      circuitBytes,
      circuitHash,
      provingKey,
      verificationKey,
      compiledAt: new Date(),
      onnxModelHash,
      supportedOps,
    };
  }

  /**
   * Simulates detecting supported operations from the ONNX model.
   * In a real implementation this would parse the ONNX protobuf.
   */
  private detectSupportedOps(modelBuffer: Buffer): string[] {
    // Use model size as a heuristic seed for which ops are present
    const hash = createHash('sha256').update(modelBuffer).digest();
    const opCount = Math.max(3, (hash[0] % DEFAULT_SUPPORTED_OPS.length) + 1);
    return DEFAULT_SUPPORTED_OPS.slice(0, opCount);
  }
}
