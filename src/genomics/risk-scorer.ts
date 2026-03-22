/**
 * Genomics Bounded Context — RiskScorer
 *
 * Computes genetic risk from SNP data using @ruvector/rvdna's
 * computeRiskScores engine (20 SNPs, 6 gene-gene interactions).
 */

import {
  computeRiskScores,
  encodeProfileVector,
  INTERACTIONS,
} from '@ruvector/rvdna';

// ── Public interfaces ────────────────────────────────────────────

export interface CategoryRiskScore {
  category: string;
  score: number;
  confidence: number;
  contributingVariants: string[];
}

export interface RiskScores {
  global: number;
  categories: Record<string, CategoryRiskScore>;
  profileVector: Float32Array;
  interactionCount: number;
}

// ── RiskScorer ───────────────────────────────────────────────────

export class RiskScorer {
  /**
   * Compute risk scores from a genotype map.
   *
   * @param genotypes - Map of rsid to genotype string (e.g. "AG")
   * @returns RiskScores with per-category breakdown and 64-dim vector
   */
  scoreFromGenotypes(genotypes: Map<string, string>): RiskScores {
    const profile = computeRiskScores(genotypes);
    const vector = encodeProfileVector(profile);

    const categories: Record<string, CategoryRiskScore> = {};
    for (const [cat, data] of Object.entries(profile.categoryScores)) {
      categories[cat] = {
        category: data.category,
        score: data.score,
        confidence: data.confidence,
        contributingVariants: data.contributingVariants,
      };
    }

    // Count how many gene-gene interactions actually fired
    // (both SNPs present in the genotype map)
    let interactionCount = 0;
    for (const interaction of INTERACTIONS) {
      if (genotypes.has(interaction.rsidA) && genotypes.has(interaction.rsidB)) {
        interactionCount++;
      }
    }

    return {
      global: profile.globalRiskScore,
      categories,
      profileVector: vector,
      interactionCount,
    };
  }
}
