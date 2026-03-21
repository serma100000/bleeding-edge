import { AgingKnowledgeGraph } from '../../src/knowledge/knowledge-graph.js';

describe('AgingKnowledgeGraph', () => {
  let graph: AgingKnowledgeGraph;

  beforeEach(() => {
    graph = new AgingKnowledgeGraph();
  });

  describe('queryCausalChain', () => {
    it('should return causal chain for a seeded CpG', () => {
      const chains = graph.queryCausalChain('cg16867657');
      expect(chains.length).toBeGreaterThan(0);
      expect(chains[0]).toEqual(
        expect.objectContaining({
          cpg: 'cg16867657',
          gene: 'ELOVL2',
          pathway: 'Fatty acid metabolism',
          agingPhase: 'late_midlife',
        }),
      );
      expect(chains[0].evidenceStrength).toBeGreaterThan(0);
    });

    it('should return empty array for unknown CpG', () => {
      const chains = graph.queryCausalChain('cg99999999');
      expect(chains).toEqual([]);
    });

    it('should return chains for a custom-added CpG pathway', () => {
      graph.addCpGPathway('cg00000001', 'BRCA1', 'DNA repair', 'early_midlife', 0.9);
      const chains = graph.queryCausalChain('cg00000001');

      expect(chains).toHaveLength(1);
      expect(chains[0]).toEqual({
        cpg: 'cg00000001',
        gene: 'BRCA1',
        pathway: 'DNA repair',
        agingPhase: 'early_midlife',
        evidenceStrength: 0.9,
      });
    });
  });

  describe('getPathwaysForGene', () => {
    it('should return multiple pathways for a gene with multiple associations', () => {
      const pathways = graph.getPathwaysForGene('FHL2');
      expect(pathways).toContain('Cardiac development');
      expect(pathways).toContain('Wnt signaling');
      expect(pathways).toHaveLength(2);
    });

    it('should return single pathway for gene with one association', () => {
      const pathways = graph.getPathwaysForGene('KLF14');
      expect(pathways).toEqual(['Metabolic regulation']);
    });

    it('should return empty for unknown gene', () => {
      const pathways = graph.getPathwaysForGene('NONEXISTENT');
      expect(pathways).toEqual([]);
    });
  });

  describe('getInterventionsForPathway', () => {
    it('should return interventions targeting a specific pathway', () => {
      const interventions = graph.getInterventionsForPathway('Fatty acid metabolism');
      expect(interventions.length).toBeGreaterThan(0);

      const names = interventions.map(i => i.interventionName);
      expect(names).toContain('Moderate aerobic exercise 150min/week');
    });

    it('should return interventions sorted by effect size (most negative first)', () => {
      const interventions = graph.getInterventionsForPathway('Metabolic regulation');
      for (let i = 1; i < interventions.length; i++) {
        expect(interventions[i].expectedEffectYears).toBeGreaterThanOrEqual(
          interventions[i - 1].expectedEffectYears,
        );
      }
    });

    it('should return empty for pathway with no interventions', () => {
      graph.addCpGPathway('cg00000099', 'TESTGENE', 'Obscure pathway', 'late_life');
      const interventions = graph.getInterventionsForPathway('Obscure pathway');
      expect(interventions).toEqual([]);
    });
  });

  describe('addIntervention', () => {
    it('should make the intervention queryable by its target pathway', () => {
      graph.addCpGPathway('cg00000002', 'TP53', 'Apoptosis', 'late_life');
      graph.addIntervention(
        'Senolytics dasatinib+quercetin', 'pharmacological',
        ['Apoptosis'], -1.2, 'preliminary', ['cg00000002'],
      );

      const interventions = graph.getInterventionsForPathway('Apoptosis');
      expect(interventions).toHaveLength(1);
      expect(interventions[0].interventionName).toBe('Senolytics dasatinib+quercetin');
      expect(interventions[0].expectedEffectYears).toBe(-1.2);
      expect(interventions[0].evidenceLevel).toBe('preliminary');
    });
  });
});
