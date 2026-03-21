// CHRONOS Knowledge Context — Intervention Recommender
// Finds interventions based on cosine similarity to "younger" epigenetic profiles

import type {
  AgingProfile,
  InterventionRecommendation,
} from '../shared/types.js';

// ── Stored profile for similarity search ────────────────────────────

interface StoredProfile {
  subjectId: string;
  embedding: Float32Array;
  biologicalAge: number;
  chronologicalAge: number;
  interventions: string[];
}

// ── Cosine similarity ───────────────────────────────────────────────

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Default intervention catalog ────────────────────────────────────

interface InterventionCatalogEntry {
  name: string;
  category: InterventionRecommendation['category'];
  expectedEffectYears: number;
  evidenceLevel: InterventionRecommendation['evidenceLevel'];
  relevantCpGs: string[];
}

const DEFAULT_CATALOG: InterventionCatalogEntry[] = [
  { name: 'Moderate aerobic exercise 150min/week', category: 'exercise', expectedEffectYears: -1.5, evidenceLevel: 'strong', relevantCpGs: ['cg16867657', 'cg10523019'] },
  { name: 'Mediterranean diet adherence', category: 'diet', expectedEffectYears: -1.1, evidenceLevel: 'strong', relevantCpGs: ['cg24724428', 'cg09809672'] },
  { name: 'Vitamin D 2000IU daily', category: 'supplement', expectedEffectYears: -0.5, evidenceLevel: 'moderate', relevantCpGs: ['cg01459453', 'cg09809672'] },
  { name: 'Metformin 500mg (off-label)', category: 'pharmacological', expectedEffectYears: -2.0, evidenceLevel: 'moderate', relevantCpGs: ['cg10523019', 'cg00481951'] },
  { name: 'Sleep optimization 7-9h', category: 'lifestyle', expectedEffectYears: -0.8, evidenceLevel: 'strong', relevantCpGs: ['cg17861230', 'cg01459453'] },
  { name: 'Resveratrol 500mg daily', category: 'supplement', expectedEffectYears: -0.4, evidenceLevel: 'preliminary', relevantCpGs: ['cg22454769', 'cg07553761'] },
  { name: 'Caloric restriction 20%', category: 'diet', expectedEffectYears: -1.8, evidenceLevel: 'moderate', relevantCpGs: ['cg10523019', 'cg04528819'] },
  { name: 'High-intensity interval training', category: 'exercise', expectedEffectYears: -1.3, evidenceLevel: 'strong', relevantCpGs: ['cg06639320', 'cg25809905'] },
  { name: 'Omega-3 supplementation 2g/day', category: 'supplement', expectedEffectYears: -0.6, evidenceLevel: 'moderate', relevantCpGs: ['cg24724428', 'cg16867657'] },
  { name: 'Rapamycin 1mg weekly (off-label)', category: 'pharmacological', expectedEffectYears: -1.6, evidenceLevel: 'preliminary', relevantCpGs: ['cg00481951', 'cg07553761'] },
  { name: 'Mindfulness meditation 30min/day', category: 'lifestyle', expectedEffectYears: -0.3, evidenceLevel: 'preliminary', relevantCpGs: ['cg08234504', 'cg17861230'] },
  { name: 'NAD+ precursor NMN 500mg/day', category: 'supplement', expectedEffectYears: -0.9, evidenceLevel: 'moderate', relevantCpGs: ['cg10523019', 'cg02228185'] },
  { name: 'Strength training 3x/week', category: 'exercise', expectedEffectYears: -1.0, evidenceLevel: 'strong', relevantCpGs: ['cg22454769', 'cg27320127'] },
  { name: 'Intermittent fasting 16:8', category: 'diet', expectedEffectYears: -0.7, evidenceLevel: 'moderate', relevantCpGs: ['cg10523019', 'cg04528819'] },
  { name: 'Cold exposure therapy', category: 'lifestyle', expectedEffectYears: -0.4, evidenceLevel: 'preliminary', relevantCpGs: ['cg01459453', 'cg09809672'] },
];

// ── Recommender ─────────────────────────────────────────────────────

export class InterventionRecommender {
  private profiles: StoredProfile[] = [];
  private catalog: InterventionCatalogEntry[];

  constructor(catalog?: InterventionCatalogEntry[]) {
    this.catalog = catalog ?? DEFAULT_CATALOG;
  }

  /** Register a stored profile for later similarity lookup. */
  addProfile(
    subjectId: string,
    embedding: Float32Array,
    biologicalAge: number,
    chronologicalAge: number,
    interventions: string[] = [],
  ): void {
    this.profiles.push({ subjectId, embedding, biologicalAge, chronologicalAge, interventions });
  }

  /**
   * Recommend interventions based on cosine similarity to stored profiles
   * that exhibit negative age acceleration (bio < chrono).
   */
  recommend(
    embedding: Float32Array,
    agingProfile: Partial<AgingProfile>,
    k: number,
  ): InterventionRecommendation[] {
    // Find "younger" profiles — those with negative age acceleration
    const younger = this.profiles.filter(p => p.biologicalAge < p.chronologicalAge);
    if (younger.length === 0) return [];

    // Score by cosine similarity
    const scored = younger.map(p => ({
      profile: p,
      similarity: cosineSimilarity(embedding, p.embedding),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    const topK = scored.slice(0, k);

    // Aggregate interventions used by the top-k similar "younger" profiles
    const interventionCounts = new Map<string, { count: number; avgSimilarity: number }>();
    for (const { profile, similarity } of topK) {
      for (const name of profile.interventions) {
        const existing = interventionCounts.get(name);
        if (existing) {
          existing.avgSimilarity = (existing.avgSimilarity * existing.count + similarity) / (existing.count + 1);
          existing.count++;
        } else {
          interventionCounts.set(name, { count: 1, avgSimilarity: similarity });
        }
      }
    }

    // Map to catalog entries and build recommendations
    const recommendations: InterventionRecommendation[] = [];
    for (const [name, stats] of interventionCounts) {
      const entry = this.catalog.find(c => c.name === name);
      if (!entry) continue;

      recommendations.push({
        interventionName: entry.name,
        category: entry.category,
        expectedEffectYears: entry.expectedEffectYears,
        evidenceLevel: entry.evidenceLevel,
        relevantCpGs: entry.relevantCpGs,
        similarProfileCount: stats.count,
        confidenceScore: stats.avgSimilarity,
      });
    }

    // Sort by absolute effect size (strongest effect first)
    recommendations.sort((a, b) => a.expectedEffectYears - b.expectedEffectYears);

    return recommendations;
  }
}
