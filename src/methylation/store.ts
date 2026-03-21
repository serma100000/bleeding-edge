import { MethylationSample } from '../shared/types.js';

export interface StoredEntry {
  sample: MethylationSample;
  embedding: Float32Array;
  storedAt: Date;
}

export interface SimilarResult {
  sampleId: string;
  sample: MethylationSample;
  similarity: number;
}

export interface StoreMetrics {
  samplesStored: number;
  totalProbesIndexed: number;
}

/**
 * In-memory store for MethylationSample objects with their embeddings.
 * Uses cosine similarity for nearest-neighbor search over embeddings.
 */
export class MethylationStore {
  private entries: Map<string, StoredEntry> = new Map();

  /**
   * Store a sample with its embedding. Overwrites if sampleId already exists.
   */
  store(sample: MethylationSample, embedding: Float32Array): void {
    this.entries.set(sample.sampleId, {
      sample,
      embedding: new Float32Array(embedding),
      storedAt: new Date(),
    });
  }

  /**
   * Retrieve a sample by ID. Returns undefined if not found.
   */
  retrieve(sampleId: string): StoredEntry | undefined {
    return this.entries.get(sampleId);
  }

  /**
   * Delete a sample by ID. Returns true if it existed.
   */
  delete(sampleId: string): boolean {
    return this.entries.delete(sampleId);
  }

  /**
   * Return the number of stored samples.
   */
  count(): number {
    return this.entries.size;
  }

  /**
   * Get storage metrics.
   */
  getMetrics(): StoreMetrics {
    let totalProbesIndexed = 0;
    for (const entry of this.entries.values()) {
      totalProbesIndexed += entry.sample.cpgSites.size;
    }
    return {
      samplesStored: this.entries.size,
      totalProbesIndexed,
    };
  }

  /**
   * Find the top-k most similar samples to the given query embedding.
   * Uses cosine similarity. Excludes the sample with excludeId if provided.
   */
  findSimilar(
    queryEmbedding: Float32Array,
    k: number = 5,
    excludeId?: string
  ): SimilarResult[] {
    const results: SimilarResult[] = [];

    for (const [id, entry] of this.entries) {
      if (id === excludeId) continue;

      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({
        sampleId: id,
        sample: entry.sample,
        similarity,
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, k);
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}
