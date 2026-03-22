// RuVector Integration Layer for CHRONOS
// Uses @ruvector/rvf for persistent vector storage with JSONL metadata sidecar
// Falls back to JSONL-only file store when native RVF is unavailable

import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  MethylationSample,
  ConsensusAge,
  InterventionRecommendation,
  CausalChain,
  ClockName,
  ProbeId,
} from './types.js';

// ============================================================
// RVF Vector Store Client — Persistent to Disk
// ============================================================

export interface RvfEntry {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface RvfQueryResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RvfStoreConfig {
  path: string;
  dimension: number;
  metric: 'cosine' | 'l2' | 'dotproduct';
}

/**
 * Persistent vector store backed by @ruvector/rvf native files.
 * Falls back to a JSONL file-based store if the native addon is unavailable.
 * Metadata is stored in a JSONL sidecar file since RVF query results
 * only return {id, distance}.
 */
export class RuVectorStore {
  private config: RvfStoreConfig;
  private initialized = false;

  // Native RVF database (null if native addon unavailable)
  private rvfDb: import('@ruvector/rvf').RvfDatabase | null = null;

  // Metadata sidecar: id -> metadata (loaded from JSONL on startup)
  private metadataMap = new Map<string, Record<string, unknown>>();

  // JSONL fallback entries (only used when native RVF unavailable)
  private fallbackEntries = new Map<string, { vector: number[]; metadata?: Record<string, unknown> }>();
  private useNative = false;

  constructor(config: RvfStoreConfig) {
    this.config = config;
  }

  /** Path to the JSONL metadata sidecar file */
  private get metadataPath(): string {
    return this.config.path.replace(/\.rvf$/, '.meta.jsonl');
  }

  /** Path to the JSONL fallback file (used when native RVF unavailable) */
  private get jsonlPath(): string {
    return this.config.path.replace(/\.rvf$/, '.jsonl');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure parent directory exists
    const dir = path.dirname(this.config.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // Try native RVF first
    try {
      const { RvfDatabase } = await import('@ruvector/rvf');

      if (existsSync(this.config.path)) {
        this.rvfDb = await RvfDatabase.open(this.config.path);
      } else {
        this.rvfDb = await RvfDatabase.create(this.config.path, {
          dimensions: this.config.dimension,
          metric: this.config.metric,
        });
      }
      this.useNative = true;

      // Load metadata sidecar
      this.loadMetadataSidecar();

      this.initialized = true;
      return;
    } catch (err) {
      console.warn(`RVF native unavailable for ${this.config.path}, using JSONL fallback: ${err}`);
    }

    // Fallback: load from JSONL file
    this.useNative = false;
    this.loadJsonlFallback();
    this.initialized = true;
  }

  async ingest(entries: RvfEntry[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (this.useNative && this.rvfDb) {
      // Ingest vectors into native RVF
      const rvfEntries = entries.map(e => ({
        id: e.id,
        vector: e.vector instanceof Float32Array ? e.vector : new Float32Array(e.vector),
      }));
      await this.rvfDb.ingestBatch(rvfEntries);

      // Append metadata to sidecar
      for (const entry of entries) {
        if (entry.metadata) {
          this.metadataMap.set(entry.id, entry.metadata);
          appendFileSync(
            this.metadataPath,
            JSON.stringify({ id: entry.id, metadata: entry.metadata }) + '\n',
            'utf-8',
          );
        }
      }
    } else {
      // JSONL fallback: append to file and keep in memory
      const lines: string[] = [];
      for (const entry of entries) {
        this.fallbackEntries.set(entry.id, {
          vector: entry.vector,
          metadata: entry.metadata,
        });
        lines.push(JSON.stringify({
          id: entry.id,
          vector: Array.from(entry.vector),
          metadata: entry.metadata,
        }));
      }
      appendFileSync(this.jsonlPath, lines.join('\n') + '\n', 'utf-8');
    }
  }

  async query(vector: number[], k = 10): Promise<RvfQueryResult[]> {
    if (!this.initialized) await this.initialize();

    if (this.useNative && this.rvfDb) {
      const queryVec = vector instanceof Float32Array
        ? vector as Float32Array
        : new Float32Array(vector);
      const results = await this.rvfDb.query(queryVec, k);

      // RVF returns distance (lower = more similar for cosine)
      // Convert to score: 1 - distance for cosine metric
      return results.map(r => ({
        id: r.id,
        score: this.config.metric === 'cosine' ? 1 - r.distance : -r.distance,
        metadata: this.metadataMap.get(r.id),
      }));
    }

    // JSONL fallback: brute-force cosine similarity
    const results: RvfQueryResult[] = [];
    for (const [id, entry] of this.fallbackEntries) {
      const score = cosineSimilarity(vector, entry.vector);
      results.push({ id, score, metadata: entry.metadata });
    }
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  async delete(ids: string[]): Promise<void> {
    if (this.useNative && this.rvfDb) {
      await this.rvfDb.delete(ids);
      for (const id of ids) {
        this.metadataMap.delete(id);
      }
      // Rewrite metadata sidecar
      this.rewriteMetadataSidecar();
    } else {
      for (const id of ids) {
        this.fallbackEntries.delete(id);
      }
      // Rewrite JSONL fallback
      this.rewriteJsonlFallback();
    }
  }

  get count(): number {
    if (this.useNative) {
      return this.metadataMap.size;
    }
    return this.fallbackEntries.size;
  }

  /** Return a single entry by ID with metadata and optional vector preview */
  getById(id: string): { id: string; metadata?: Record<string, unknown>; vector?: number[] } | null {
    if (this.useNative) {
      const metadata = this.metadataMap.get(id);
      if (!metadata) return null;
      return { id, metadata };
    }
    const entry = this.fallbackEntries.get(id);
    if (!entry) return null;
    return {
      id,
      metadata: entry.metadata,
      vector: entry.vector.slice(0, 10),
    };
  }

  /** Return all entries with their metadata (for population listing) */
  listAll(limit = 100): Array<{ id: string; metadata?: Record<string, unknown> }> {
    if (this.useNative) {
      const results: Array<{ id: string; metadata?: Record<string, unknown> }> = [];
      let count = 0;
      for (const [id, metadata] of this.metadataMap) {
        if (count >= limit) break;
        results.push({ id, metadata });
        count++;
      }
      return results;
    }
    const results: Array<{ id: string; metadata?: Record<string, unknown> }> = [];
    let count = 0;
    for (const [id, entry] of this.fallbackEntries) {
      if (count >= limit) break;
      results.push({ id, metadata: entry.metadata });
      count++;
    }
    return results;
  }

  /** Close the underlying RVF database (call on shutdown) */
  async close(): Promise<void> {
    if (this.rvfDb && !this.rvfDb.isClosed) {
      await this.rvfDb.close();
    }
  }

  // ── Private helpers ──────────────────────────────────────────

  private loadMetadataSidecar(): void {
    if (!existsSync(this.metadataPath)) return;
    const content = readFileSync(this.metadataPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { id: string; metadata: Record<string, unknown> };
        this.metadataMap.set(parsed.id, parsed.metadata);
      } catch { /* skip malformed lines */ }
    }
  }

  private rewriteMetadataSidecar(): void {
    const lines: string[] = [];
    for (const [id, metadata] of this.metadataMap) {
      lines.push(JSON.stringify({ id, metadata }));
    }
    writeFileSync(this.metadataPath, lines.join('\n') + '\n', 'utf-8');
  }

  private loadJsonlFallback(): void {
    if (!existsSync(this.jsonlPath)) return;
    const content = readFileSync(this.jsonlPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { id: string; vector: number[]; metadata?: Record<string, unknown> };
        this.fallbackEntries.set(parsed.id, {
          vector: parsed.vector,
          metadata: parsed.metadata,
        });
      } catch { /* skip malformed lines */ }
    }
  }

  private rewriteJsonlFallback(): void {
    const lines: string[] = [];
    for (const [id, entry] of this.fallbackEntries) {
      lines.push(JSON.stringify({ id, vector: Array.from(entry.vector), metadata: entry.metadata }));
    }
    writeFileSync(this.jsonlPath, lines.join('\n') + '\n', 'utf-8');
  }
}

// ============================================================
// Brain Knowledge Client
// ============================================================

export interface BrainEntry {
  id?: string;
  title: string;
  content: string;
  category: 'pattern' | 'solution' | 'architecture' | 'convention' | 'security' | 'performance' | 'tooling';
  tags?: string;
  codeSnippet?: string;
}

export interface BrainSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  category: string;
}

export class RuVectorBrain {
  private fallbackStore = new Map<string, BrainEntry>();
  private nextId = 1;

  async share(entry: BrainEntry): Promise<string> {
    // MCP call: brain_share({ title, content, category, tags, code_snippet })
    // Fallback: store in memory
    const id = entry.id ?? `brain-${this.nextId++}`;
    this.fallbackStore.set(id, { ...entry, id });
    return id;
  }

  async search(query: string, limit = 10): Promise<BrainSearchResult[]> {
    // MCP call: brain_search({ query, limit })
    // Fallback: simple text matching
    const results: BrainSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [id, entry] of this.fallbackStore) {
      const text = `${entry.title} ${entry.content} ${entry.tags ?? ''}`.toLowerCase();
      const words = queryLower.split(/\s+/);
      const matchCount = words.filter(w => text.includes(w)).length;
      if (matchCount > 0) {
        results.push({
          id,
          title: entry.title,
          content: entry.content,
          score: matchCount / words.length,
          category: entry.category,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async get(id: string): Promise<BrainEntry | undefined> {
    return this.fallbackStore.get(id);
  }
}

// ============================================================
// Hooks Intelligence Client
// ============================================================

export class RuVectorHooks {
  private memoryStore = new Map<string, { content: string; type: string }>();
  private nextId = 1;

  async remember(content: string, type: 'project' | 'code' | 'decision' | 'context' = 'context'): Promise<string> {
    // MCP call: hooks_remember({ content, type })
    const id = `mem-${this.nextId++}`;
    this.memoryStore.set(id, { content, type });
    return id;
  }

  async recall(query: string, topK = 5): Promise<Array<{ id: string; content: string; score: number }>> {
    // MCP call: hooks_recall({ query, top_k })
    const results: Array<{ id: string; content: string; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const [id, entry] of this.memoryStore) {
      const words = queryLower.split(/\s+/);
      const matchCount = words.filter(w => entry.content.toLowerCase().includes(w)).length;
      if (matchCount > 0) {
        results.push({ id, content: entry.content, score: matchCount / words.length });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async route(task: string): Promise<{ agent: string; confidence: number; reasoning: string }> {
    // MCP call: hooks_route({ task })
    // Fallback: simple keyword routing
    const taskLower = task.toLowerCase();
    if (taskLower.includes('methylation') || taskLower.includes('cpg')) {
      return { agent: 'methylation-agent', confidence: 0.8, reasoning: 'Methylation-related task' };
    }
    if (taskLower.includes('clock') || taskLower.includes('age')) {
      return { agent: 'clock-agent', confidence: 0.8, reasoning: 'Clock inference task' };
    }
    if (taskLower.includes('proof') || taskLower.includes('verify')) {
      return { agent: 'zk-prover-agent', confidence: 0.8, reasoning: 'ZK proof task' };
    }
    if (taskLower.includes('recommend') || taskLower.includes('intervention')) {
      return { agent: 'recommender-agent', confidence: 0.8, reasoning: 'Intervention recommendation task' };
    }
    return { agent: 'coordinator', confidence: 0.5, reasoning: 'Default routing' };
  }
}

// ============================================================
// CHRONOS-Specific RuVector Service
// ============================================================

export class ChronosRuVectorService {
  readonly methylationStore: RuVectorStore;
  readonly patientStore: RuVectorStore;
  readonly interventionStore: RuVectorStore;
  readonly brain: RuVectorBrain;
  readonly hooks: RuVectorHooks;

  constructor(dataDir: string) {
    this.methylationStore = new RuVectorStore({
      path: `${dataDir}/methylation-embeddings.rvf`,
      dimension: 256,
      metric: 'cosine',
    });
    this.patientStore = new RuVectorStore({
      path: `${dataDir}/patient-profiles.rvf`,
      dimension: 256,
      metric: 'cosine',
    });
    this.interventionStore = new RuVectorStore({
      path: `${dataDir}/interventions.rvf`,
      dimension: 256,
      metric: 'cosine',
    });
    this.brain = new RuVectorBrain();
    this.hooks = new RuVectorHooks();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.methylationStore.initialize(),
      this.patientStore.initialize(),
      this.interventionStore.initialize(),
    ]);
  }

  // Store a methylation sample embedding
  async storeSampleEmbedding(
    sampleId: string,
    embedding: Float32Array,
    metadata: { subjectId: string; chronologicalAge: number; tissueType: string }
  ): Promise<void> {
    await this.methylationStore.ingest([{
      id: sampleId,
      vector: Array.from(embedding),
      metadata,
    }]);
  }

  // Find similar methylation profiles
  async findSimilarProfiles(embedding: Float32Array, k = 10): Promise<RvfQueryResult[]> {
    return this.patientStore.query(Array.from(embedding), k);
  }

  // Store consensus result in brain for learning
  async storeConsensusResult(consensusAge: ConsensusAge, sampleId: string): Promise<void> {
    await this.brain.share({
      title: `Consensus: ${consensusAge.consensusBiologicalAge.toFixed(1)} years (${sampleId})`,
      content: JSON.stringify({
        consensusAge: consensusAge.consensusBiologicalAge,
        weights: consensusAge.weights,
        committed: consensusAge.committedClocks,
        method: consensusAge.consensusMethod,
      }),
      category: 'pattern',
      tags: 'consensus,epigenetic,age-prediction',
    });
  }

  // Remember clock weight adjustments for learning
  async learnClockWeights(weights: Record<ClockName, number>, accuracy: number): Promise<void> {
    await this.hooks.remember(
      JSON.stringify({ weights, accuracy, timestamp: Date.now() }),
      'decision'
    );
  }

  // Recall best-performing clock weights
  async recallBestWeights(): Promise<Record<ClockName, number> | null> {
    const results = await this.hooks.recall('clock weights accuracy', 1);
    if (results.length === 0) return null;
    try {
      const data = JSON.parse(results[0].content);
      return data.weights;
    } catch {
      return null;
    }
  }

  // Store causal chain knowledge
  async storeCausalChain(chain: CausalChain): Promise<void> {
    await this.brain.share({
      title: `${chain.cpg} → ${chain.gene} → ${chain.pathway}`,
      content: JSON.stringify(chain),
      category: 'pattern',
      tags: `cpg,${chain.gene},${chain.pathway},${chain.agingPhase}`,
    });
  }

  // Search for relevant causal chains
  async searchCausalChains(query: string): Promise<CausalChain[]> {
    const results = await this.brain.search(query, 20);
    return results
      .map(r => {
        try { return JSON.parse(r.content) as CausalChain; }
        catch { return null; }
      })
      .filter((c): c is CausalChain => c !== null);
  }

  // Route a pipeline task to the best agent
  async routeTask(task: string): Promise<string> {
    const result = await this.hooks.route(task);
    return result.agent;
  }
}

// ============================================================
// Utility Functions
// ============================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
