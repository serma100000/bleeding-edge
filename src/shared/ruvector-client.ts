// RuVector MCP Integration Layer for CHRONOS
// Wraps RuVector MCP tools into typed service interfaces
// Falls back to in-memory when MCP is unavailable

import type {
  MethylationSample,
  ConsensusAge,
  InterventionRecommendation,
  CausalChain,
  ClockName,
  ProbeId,
} from './types.js';

// ============================================================
// RVF Vector Store Client
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

export class RuVectorStore {
  private config: RvfStoreConfig;
  private initialized = false;

  // In-memory fallback when MCP unavailable
  private fallbackEntries = new Map<string, { vector: number[]; metadata?: Record<string, unknown> }>();

  constructor(config: RvfStoreConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Attempt to create/open RVF store via MCP
    // Falls back to in-memory if MCP unavailable
    try {
      // MCP call: rvf_create or rvf_open
      // For now, mark as initialized with fallback
      this.initialized = true;
    } catch {
      console.warn(`RuVector MCP unavailable, using in-memory fallback for ${this.config.path}`);
      this.initialized = true;
    }
  }

  async ingest(entries: RvfEntry[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    // MCP call: rvf_ingest({ path, entries })
    // Fallback: store in memory
    for (const entry of entries) {
      this.fallbackEntries.set(entry.id, {
        vector: entry.vector,
        metadata: entry.metadata,
      });
    }
  }

  async query(vector: number[], k = 10): Promise<RvfQueryResult[]> {
    if (!this.initialized) await this.initialize();

    // MCP call: rvf_query({ path, vector, k })
    // Fallback: cosine similarity search in memory
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
    for (const id of ids) {
      this.fallbackEntries.delete(id);
    }
  }

  get count(): number {
    return this.fallbackEntries.size;
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
