/**
 * Genomics Bounded Context — GenomicAnalyzer
 *
 * Wraps @ruvector/rvdna to parse 23andMe files, call pharmacogenomic
 * diplotypes, determine APOE genotype, compute risk scores, and
 * generate drug recommendations from CYP metaboliser phenotypes.
 */

import {
  parse23andMe,
  callCyp2d6,
  callCyp2c19,
  determineApoe,
  computeRiskScores,
  encodeProfileVector,
} from '@ruvector/rvdna';

// ── Public interfaces ────────────────────────────────────────────

export interface DrugRecommendation {
  drug: string;
  gene: string;
  phenotype: string;
  recommendation: string;
  /** 1.0 = standard dose, 0.5 = reduce, 0 = avoid */
  doseFactor: number;
}

export interface GenomicProfile {
  subjectId: string;
  totalMarkers: number;
  build: string;
  cyp2d6: {
    allele1: string;
    allele2: string;
    phenotype: string;
    activity: number;
  };
  cyp2c19: {
    allele1: string;
    allele2: string;
    phenotype: string;
    activity: number;
  };
  apoe: { genotype: string };
  riskScores: {
    global: number;
    cancer: number;
    cardiovascular: number;
    neurological: number;
    metabolism: number;
  };
  /** 64-dim L2-normalised profile vector */
  profileVector: Float32Array;
  drugRecommendations: DrugRecommendation[];
}

// ── Drug recommendation rules ────────────────────────────────────

interface DrugRule {
  drug: string;
  gene: 'CYP2D6' | 'CYP2C19';
  recommendations: Record<string, { recommendation: string; doseFactor: number }>;
}

const DRUG_RULES: DrugRule[] = [
  {
    drug: 'Codeine',
    gene: 'CYP2D6',
    recommendations: {
      UltraRapid: { recommendation: 'Avoid codeine — risk of toxicity from rapid conversion to morphine', doseFactor: 0 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Reduced efficacy expected — consider alternative analgesic', doseFactor: 0.5 },
      Poor: { recommendation: 'Avoid codeine — no conversion to active metabolite', doseFactor: 0 },
    },
  },
  {
    drug: 'Tramadol',
    gene: 'CYP2D6',
    recommendations: {
      UltraRapid: { recommendation: 'Avoid tramadol — risk of respiratory depression', doseFactor: 0 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Reduce dose by 50%', doseFactor: 0.5 },
      Poor: { recommendation: 'Avoid tramadol — insufficient activation', doseFactor: 0 },
    },
  },
  {
    drug: 'Tamoxifen',
    gene: 'CYP2D6',
    recommendations: {
      UltraRapid: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Consider alternative — reduced endoxifen formation', doseFactor: 0.5 },
      Poor: { recommendation: 'Avoid tamoxifen — use aromatase inhibitor instead', doseFactor: 0 },
    },
  },
  {
    drug: 'Clopidogrel',
    gene: 'CYP2C19',
    recommendations: {
      UltraRapid: { recommendation: 'Standard dose — enhanced activation', doseFactor: 1.0 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Consider prasugrel or ticagrelor', doseFactor: 0.5 },
      Poor: { recommendation: 'Avoid clopidogrel — use prasugrel or ticagrelor', doseFactor: 0 },
    },
  },
  {
    drug: 'Omeprazole',
    gene: 'CYP2C19',
    recommendations: {
      UltraRapid: { recommendation: 'Increase dose — rapid clearance', doseFactor: 1.5 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Standard dose — may have increased exposure', doseFactor: 1.0 },
      Poor: { recommendation: 'Reduce dose by 50% — slow clearance', doseFactor: 0.5 },
    },
  },
  {
    drug: 'Voriconazole',
    gene: 'CYP2C19',
    recommendations: {
      UltraRapid: { recommendation: 'Avoid voriconazole or increase dose significantly', doseFactor: 0 },
      Normal: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Intermediate: { recommendation: 'Standard dose', doseFactor: 1.0 },
      Poor: { recommendation: 'Reduce dose by 50% — risk of toxicity', doseFactor: 0.5 },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────

function buildGenotypeMap(snps: Map<string, { genotype: string }>): Map<string, string> {
  const gts = new Map<string, string>();
  for (const [rsid, snp] of snps) {
    gts.set(rsid, snp.genotype);
  }
  return gts;
}

function extractCategoryScore(
  categoryScores: Record<string, { score: number }>,
  name: string,
): number {
  const entry = categoryScores[name];
  return entry ? entry.score : 0;
}

function generateDrugRecommendations(
  cyp2d6Phenotype: string,
  cyp2c19Phenotype: string,
): DrugRecommendation[] {
  const recommendations: DrugRecommendation[] = [];

  for (const rule of DRUG_RULES) {
    const phenotype = rule.gene === 'CYP2D6' ? cyp2d6Phenotype : cyp2c19Phenotype;
    const entry = rule.recommendations[phenotype];
    if (!entry) continue;

    // Only emit recommendations for non-Normal metabolisers
    if (phenotype !== 'Normal') {
      recommendations.push({
        drug: rule.drug,
        gene: rule.gene,
        phenotype,
        recommendation: entry.recommendation,
        doseFactor: entry.doseFactor,
      });
    }
  }

  return recommendations;
}

// ── GenomicAnalyzer ──────────────────────────────────────────────

export class GenomicAnalyzer {
  /**
   * Parse a raw 23andMe file and produce a full genomic profile.
   *
   * @param rawText  - Contents of a 23andMe raw-data export
   * @param subjectId - Unique subject identifier
   * @returns Fully populated GenomicProfile
   */
  analyze(rawText: string, subjectId: string): GenomicProfile {
    // 1. Parse raw file
    const parsed = parse23andMe(rawText);
    const gts = buildGenotypeMap(parsed.snps);

    // 2. Pharmacogenomic diplotypes
    const cyp2d6 = callCyp2d6(gts);
    const cyp2c19 = callCyp2c19(gts);

    // 3. APOE
    const apoe = determineApoe(gts);

    // 4. Risk scores
    const riskProfile = computeRiskScores(gts);
    const profileVector = encodeProfileVector(riskProfile);

    // 5. Drug recommendations
    const drugRecommendations = generateDrugRecommendations(
      cyp2d6.phenotype,
      cyp2c19.phenotype,
    );

    return {
      subjectId,
      totalMarkers: parsed.totalMarkers,
      build: parsed.build,
      cyp2d6: {
        allele1: cyp2d6.allele1,
        allele2: cyp2d6.allele2,
        phenotype: cyp2d6.phenotype,
        activity: cyp2d6.activity,
      },
      cyp2c19: {
        allele1: cyp2c19.allele1,
        allele2: cyp2c19.allele2,
        phenotype: cyp2c19.phenotype,
        activity: cyp2c19.activity,
      },
      apoe: { genotype: apoe.genotype },
      riskScores: {
        global: riskProfile.globalRiskScore,
        cancer: extractCategoryScore(riskProfile.categoryScores, 'Cancer Risk'),
        cardiovascular: extractCategoryScore(riskProfile.categoryScores, 'Cardiovascular'),
        neurological: extractCategoryScore(riskProfile.categoryScores, 'Neurological'),
        metabolism: extractCategoryScore(riskProfile.categoryScores, 'Metabolism'),
      },
      profileVector,
      drugRecommendations,
    };
  }
}
