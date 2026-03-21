// CHRONOS Knowledge Context — Aging Knowledge Graph
// In-memory graph using adjacency lists for CpG-Gene-Pathway-AgingPhase relationships

import type {
  ProbeId,
  CausalChain,
  InterventionRecommendation,
} from '../shared/types.js';

// ── Node types ──────────────────────────────────────────────────────

type AgingPhase = 'early_life' | 'early_midlife' | 'late_midlife' | 'late_life';

type NodeKind = 'CpGSite' | 'Gene' | 'Pathway' | 'AgingPhase' | 'Intervention';

interface GraphNode {
  id: string;
  kind: NodeKind;
  data: Record<string, unknown>;
}

// ── Edge types ──────────────────────────────────────────────────────

type EdgeRelation =
  | 'REGULATES'
  | 'INVOLVED_IN'
  | 'ASSOCIATED_WITH'
  | 'REDUCES_ACCELERATION';

interface GraphEdge {
  source: string;
  target: string;
  relation: EdgeRelation;
  evidenceStrength: number;
}

// ── Intervention data stored on Intervention nodes ──────────────────

interface InterventionData {
  name: string;
  category: InterventionRecommendation['category'];
  expectedEffectYears: number;
  evidenceLevel: InterventionRecommendation['evidenceLevel'];
  targetPathways: string[];
  relevantCpGs: ProbeId[];
}

// ── Graph Implementation ────────────────────────────────────────────

export class AgingKnowledgeGraph {
  private nodes = new Map<string, GraphNode>();
  private adjacency = new Map<string, GraphEdge[]>();

  constructor() {
    this.seedDefaults();
  }

  // ── Mutation ────────────────────────────────────────────────────

  addCpGPathway(
    cpg: ProbeId,
    gene: string,
    pathway: string,
    agingPhase: AgingPhase,
    evidenceStrength = 0.8,
  ): void {
    this.ensureNode(cpg, 'CpGSite');
    this.ensureNode(gene, 'Gene');
    this.ensureNode(pathway, 'Pathway');
    this.ensureNode(agingPhase, 'AgingPhase');

    this.addEdge(cpg, gene, 'REGULATES', evidenceStrength);
    this.addEdge(gene, pathway, 'INVOLVED_IN', evidenceStrength);
    this.addEdge(pathway, agingPhase, 'ASSOCIATED_WITH', evidenceStrength);
  }

  addIntervention(
    name: string,
    category: InterventionRecommendation['category'],
    targetPathways: string[],
    expectedEffect: number,
    evidenceLevel: InterventionRecommendation['evidenceLevel'] = 'moderate',
    relevantCpGs: ProbeId[] = [],
  ): void {
    const id = `intervention:${name}`;
    const data: InterventionData = {
      name,
      category,
      expectedEffectYears: expectedEffect,
      evidenceLevel,
      targetPathways,
      relevantCpGs,
    };
    this.ensureNode(id, 'Intervention', data as unknown as Record<string, unknown>);

    for (const pw of targetPathways) {
      this.ensureNode(pw, 'Pathway');
      this.addEdge(id, pw, 'REDUCES_ACCELERATION', Math.abs(expectedEffect));
    }
  }

  // ── Queries ────────────────────────────────────────────────────

  queryCausalChain(cpg: ProbeId): CausalChain[] {
    const chains: CausalChain[] = [];
    const geneEdges = this.outEdges(cpg).filter(e => e.relation === 'REGULATES');

    for (const ge of geneEdges) {
      const gene = ge.target;
      const pathwayEdges = this.outEdges(gene).filter(e => e.relation === 'INVOLVED_IN');

      for (const pe of pathwayEdges) {
        const pathway = pe.target;
        const phaseEdges = this.outEdges(pathway).filter(e => e.relation === 'ASSOCIATED_WITH');

        for (const ae of phaseEdges) {
          chains.push({
            cpg,
            gene,
            pathway,
            agingPhase: ae.target as AgingPhase,
            evidenceStrength: Math.min(ge.evidenceStrength, pe.evidenceStrength, ae.evidenceStrength),
          });
        }
      }
    }

    return chains;
  }

  getPathwaysForGene(gene: string): string[] {
    return this.outEdges(gene)
      .filter(e => e.relation === 'INVOLVED_IN')
      .map(e => e.target);
  }

  getInterventionsForPathway(pathway: string): InterventionRecommendation[] {
    // Walk inbound edges to find interventions that REDUCES_ACCELERATION → pathway
    const results: InterventionRecommendation[] = [];

    for (const [nodeId, node] of this.nodes) {
      if (node.kind !== 'Intervention') continue;
      const edges = this.outEdges(nodeId).filter(
        e => e.relation === 'REDUCES_ACCELERATION' && e.target === pathway,
      );
      if (edges.length === 0) continue;

      const d = node.data as unknown as InterventionData;
      results.push({
        interventionName: d.name,
        category: d.category,
        expectedEffectYears: d.expectedEffectYears,
        evidenceLevel: d.evidenceLevel,
        relevantCpGs: d.relevantCpGs,
        similarProfileCount: 0,
        confidenceScore: edges[0].evidenceStrength,
      });
    }

    return results.sort((a, b) => a.expectedEffectYears - b.expectedEffectYears);
  }

  // ── Internal helpers ──────────────────────────────────────────

  private ensureNode(id: string, kind: NodeKind, data: Record<string, unknown> = {}): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, kind, data });
      this.adjacency.set(id, []);
    } else if (Object.keys(data).length > 0) {
      // Update data on existing node
      this.nodes.get(id)!.data = data;
    }
  }

  private addEdge(source: string, target: string, relation: EdgeRelation, evidenceStrength: number): void {
    const edges = this.adjacency.get(source);
    if (!edges) return;
    // Avoid duplicates
    const exists = edges.some(e => e.target === target && e.relation === relation);
    if (!exists) {
      edges.push({ source, target, relation, evidenceStrength });
    }
  }

  private outEdges(nodeId: string): GraphEdge[] {
    return this.adjacency.get(nodeId) ?? [];
  }

  // ── Seed data (20 well-known CpG-gene-pathway associations) ──

  private seedDefaults(): void {
    const associations: [ProbeId, string, string, AgingPhase, number][] = [
      // Horvath & Hannum clock CpGs
      ['cg16867657', 'ELOVL2', 'Fatty acid metabolism', 'late_midlife', 0.95],
      ['cg06639320', 'FHL2', 'Cardiac development', 'early_midlife', 0.90],
      ['cg00481951', 'CCDC102B', 'Cell cycle regulation', 'late_life', 0.85],
      ['cg22454769', 'FHL2', 'Wnt signaling', 'early_midlife', 0.88],
      ['cg24724428', 'ELOVL2', 'Lipid biosynthesis', 'late_midlife', 0.92],
      ['cg10523019', 'KLF14', 'Metabolic regulation', 'late_midlife', 0.80],
      ['cg01459453', 'TRIM59', 'Immune response', 'early_midlife', 0.82],
      ['cg02228185', 'ASPA', 'N-acetylaspartate metabolism', 'early_life', 0.87],
      ['cg25809905', 'ITGA2B', 'Platelet activation', 'late_life', 0.78],
      ['cg17861230', 'PDE4C', 'cAMP signaling', 'late_midlife', 0.84],
      ['cg07553761', 'TRIM59', 'Ubiquitin-proteasome pathway', 'early_midlife', 0.81],
      ['cg12373771', 'SLC12A5', 'Chloride transport', 'early_life', 0.76],
      ['cg19722847', 'IPO8', 'Nuclear transport', 'late_life', 0.79],
      ['cg09809672', 'EDARADD', 'NF-kB signaling', 'early_midlife', 0.86],
      ['cg11299964', 'C1orf132', 'MicroRNA regulation', 'late_life', 0.83],
      ['cg14975410', 'OTUD7A', 'Deubiquitination', 'late_midlife', 0.77],
      ['cg04528819', 'NHLRC1', 'Glycogen metabolism', 'late_life', 0.74],
      ['cg08234504', 'GRIA2', 'Glutamate signaling', 'early_life', 0.80],
      ['cg07955995', 'CNTN4', 'Neuronal cell adhesion', 'early_life', 0.75],
      ['cg27320127', 'LDB2', 'Transcription regulation', 'early_midlife', 0.82],
    ];

    for (const [cpg, gene, pathway, phase, evidence] of associations) {
      this.addCpGPathway(cpg, gene, pathway, phase, evidence);
    }

    // Seed default interventions
    this.addIntervention(
      'Moderate aerobic exercise 150min/week', 'exercise',
      ['Fatty acid metabolism', 'Metabolic regulation', 'cAMP signaling'],
      -1.5, 'strong', ['cg16867657', 'cg10523019'],
    );
    this.addIntervention(
      'Mediterranean diet adherence', 'diet',
      ['Lipid biosynthesis', 'Fatty acid metabolism', 'NF-kB signaling'],
      -1.1, 'strong', ['cg24724428', 'cg09809672'],
    );
    this.addIntervention(
      'Vitamin D 2000IU daily', 'supplement',
      ['Immune response', 'NF-kB signaling'],
      -0.5, 'moderate', ['cg01459453', 'cg09809672'],
    );
    this.addIntervention(
      'Metformin 500mg (off-label)', 'pharmacological',
      ['Metabolic regulation', 'Cell cycle regulation'],
      -2.0, 'moderate', ['cg10523019', 'cg00481951'],
    );
    this.addIntervention(
      'Sleep optimization 7-9h', 'lifestyle',
      ['cAMP signaling', 'Immune response'],
      -0.8, 'strong', ['cg17861230', 'cg01459453'],
    );
    this.addIntervention(
      'Resveratrol 500mg daily', 'supplement',
      ['Wnt signaling', 'Ubiquitin-proteasome pathway'],
      -0.4, 'preliminary', ['cg22454769', 'cg07553761'],
    );
    this.addIntervention(
      'Caloric restriction 20%', 'diet',
      ['Metabolic regulation', 'Glycogen metabolism', 'Cell cycle regulation'],
      -1.8, 'moderate', ['cg10523019', 'cg04528819'],
    );
    this.addIntervention(
      'High-intensity interval training', 'exercise',
      ['Cardiac development', 'Platelet activation', 'Fatty acid metabolism'],
      -1.3, 'strong', ['cg06639320', 'cg25809905'],
    );
    this.addIntervention(
      'Omega-3 supplementation 2g/day', 'supplement',
      ['Lipid biosynthesis', 'Fatty acid metabolism'],
      -0.6, 'moderate', ['cg24724428', 'cg16867657'],
    );
    this.addIntervention(
      'Rapamycin 1mg weekly (off-label)', 'pharmacological',
      ['Cell cycle regulation', 'Ubiquitin-proteasome pathway'],
      -1.6, 'preliminary', ['cg00481951', 'cg07553761'],
    );
    this.addIntervention(
      'Mindfulness meditation 30min/day', 'lifestyle',
      ['Glutamate signaling', 'cAMP signaling'],
      -0.3, 'preliminary', ['cg08234504', 'cg17861230'],
    );
    this.addIntervention(
      'NAD+ precursor NMN 500mg/day', 'supplement',
      ['Metabolic regulation', 'N-acetylaspartate metabolism'],
      -0.9, 'moderate', ['cg10523019', 'cg02228185'],
    );
    this.addIntervention(
      'Strength training 3x/week', 'exercise',
      ['Wnt signaling', 'Transcription regulation'],
      -1.0, 'strong', ['cg22454769', 'cg27320127'],
    );
    this.addIntervention(
      'Intermittent fasting 16:8', 'diet',
      ['Metabolic regulation', 'Glycogen metabolism'],
      -0.7, 'moderate', ['cg10523019', 'cg04528819'],
    );
    this.addIntervention(
      'Cold exposure therapy', 'lifestyle',
      ['Immune response', 'NF-kB signaling', 'cAMP signaling'],
      -0.4, 'preliminary', ['cg01459453', 'cg09809672'],
    );
  }
}
