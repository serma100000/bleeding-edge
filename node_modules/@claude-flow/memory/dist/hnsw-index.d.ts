/**
 * V3 HNSW Vector Index
 *
 * High-performance Hierarchical Navigable Small World (HNSW) index for
 * 150x-12,500x faster vector similarity search compared to brute force.
 *
 * OPTIMIZATIONS:
 * - BinaryMinHeap/BinaryMaxHeap for O(log n) operations (vs O(n log n) Array.sort)
 * - Pre-normalized vectors for O(1) cosine similarity (no sqrt needed)
 * - Bounded max-heap for efficient top-k tracking
 *
 * @module v3/memory/hnsw-index
 */
import { EventEmitter } from 'node:events';
import { HNSWConfig, HNSWStats } from './types.js';
/**
 * HNSW Index implementation for ultra-fast vector similarity search
 *
 * Performance characteristics:
 * - Search: O(log n) approximate nearest neighbor
 * - Insert: O(log n) amortized
 * - Memory: O(n * M * L) where M is max connections, L is layers
 */
export declare class HNSWIndex extends EventEmitter {
    private config;
    private nodes;
    private entryPoint;
    private maxLevel;
    private levelMult;
    private stats;
    private quantizer;
    constructor(config?: Partial<HNSWConfig>);
    /**
     * Add a vector to the index
     */
    addPoint(id: string, vector: Float32Array): Promise<void>;
    /**
     * Search for k nearest neighbors
     */
    search(query: Float32Array, k: number, ef?: number): Promise<Array<{
        id: string;
        distance: number;
    }>>;
    /**
     * Search with filters applied post-retrieval
     */
    searchWithFilters(query: Float32Array, k: number, filter: (id: string) => boolean, ef?: number): Promise<Array<{
        id: string;
        distance: number;
    }>>;
    /**
     * Remove a point from the index
     */
    removePoint(id: string): Promise<boolean>;
    /**
     * Rebuild the index from scratch
     */
    rebuild(entries: Array<{
        id: string;
        vector: Float32Array;
    }>): Promise<void>;
    /**
     * Get index statistics
     */
    getStats(): HNSWStats;
    /**
     * Clear the index
     */
    clear(): void;
    /**
     * Check if an ID exists in the index
     */
    has(id: string): boolean;
    /**
     * Get the number of vectors in the index
     */
    get size(): number;
    private mergeConfig;
    private getRandomLevel;
    private insertNode;
    private searchLayer;
    /**
     * OPTIMIZED searchLayer using heap-based priority queues
     * Performance: O(log n) per operation vs O(n log n) for Array.sort()
     * Expected speedup: 3-5x for large result sets
     */
    private searchLayerOptimized;
    private selectNeighbors;
    private pruneConnections;
    private distance;
    private cosineDistance;
    /**
     * OPTIMIZED: Cosine distance using pre-normalized vectors
     * Only requires dot product (no sqrt operations)
     * Performance: O(n) with ~2x speedup over standard cosine
     */
    private cosineDistanceNormalized;
    /**
     * Normalize a vector to unit length for O(1) cosine similarity
     */
    private normalizeVector;
    /**
     * OPTIMIZED distance calculation that uses pre-normalized vectors when available
     */
    private distanceOptimized;
    private euclideanDistance;
    private dotProductDistance;
    private manhattanDistance;
}
export default HNSWIndex;
//# sourceMappingURL=hnsw-index.d.ts.map