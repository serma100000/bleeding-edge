import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Search } from 'lucide-react';
import type { CausalChain } from '@/types/api';
import type { GraphNode } from './NodeDetailPanel';
import { cn } from '@/lib/utils';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';

interface KnowledgeGraphVizProps {
  causalChains: CausalChain[];
  onNodeSelect: (node: GraphNode) => void;
}

type NodeType = 'CpG' | 'Gene' | 'Pathway' | 'AgingPhase';

const NODE_TYPE_CONFIG: Record<NodeType, { color: string; label: string }> = {
  CpG: { color: '#818cf8', label: 'CpG' },
  Gene: { color: '#34d399', label: 'Gene' },
  Pathway: { color: '#fbbf24', label: 'Pathway' },
  AgingPhase: { color: '#a78bfa', label: 'Aging Phase' },
};

const PHASE_LABELS: Record<string, string> = {
  early_life: 'Early Life',
  early_midlife: 'Early Midlife',
  late_midlife: 'Late Midlife',
  late_life: 'Late Life',
};

interface InternalNode {
  id: string;
  type: NodeType;
  label: string;
  evidenceStrength: number;
  val: number;
  color: string;
  x?: number;
  y?: number;
}

interface InternalLink {
  source: string;
  target: string;
  label: string;
}

function buildGraphData(chains: CausalChain[]) {
  const nodesMap = new Map<string, InternalNode>();
  const links: InternalLink[] = [];

  // Gather CpG contribution data for node details
  const cpgBetaMap = new Map<string, number>();
  const cpgShapMap = new Map<string, { probeId: string; shapValue: number; direction: string }[]>();
  for (const cr of MOCK_PIPELINE_RUN.clockResults) {
    for (const cpg of cr.topContributingCpGs) {
      cpgBetaMap.set(cpg.probeId, cpg.betaValue);
      if (!cpgShapMap.has(cpg.probeId)) cpgShapMap.set(cpg.probeId, []);
      cpgShapMap.get(cpg.probeId)!.push({
        probeId: cr.clockName,
        shapValue: cpg.shapValue,
        direction: cpg.direction,
      });
    }
  }

  // Gather pathway->intervention mapping
  const pathwayInterventions = new Map<string, string[]>();
  // No direct mapping in mock data, but we can derive from relevantCpGs + causal chains
  for (const rec of MOCK_PIPELINE_RUN.recommendations) {
    for (const chain of chains) {
      if (rec.relevantCpGs.includes(chain.cpg)) {
        if (!pathwayInterventions.has(chain.pathway)) {
          pathwayInterventions.set(chain.pathway, []);
        }
        const arr = pathwayInterventions.get(chain.pathway)!;
        if (!arr.includes(rec.interventionName)) {
          arr.push(rec.interventionName);
        }
      }
    }
  }

  for (const chain of chains) {
    const cpgId = `cpg-${chain.cpg}`;
    const geneId = `gene-${chain.gene}`;
    const pathwayId = `pathway-${chain.pathway}`;
    const phaseId = `phase-${chain.agingPhase}`;

    if (!nodesMap.has(cpgId)) {
      nodesMap.set(cpgId, {
        id: cpgId,
        type: 'CpG',
        label: chain.cpg,
        evidenceStrength: chain.evidenceStrength,
        val: chain.evidenceStrength * 6 + 2,
        color: NODE_TYPE_CONFIG.CpG.color,
      });
    }
    if (!nodesMap.has(geneId)) {
      nodesMap.set(geneId, {
        id: geneId,
        type: 'Gene',
        label: chain.gene,
        evidenceStrength: chain.evidenceStrength,
        val: chain.evidenceStrength * 5 + 3,
        color: NODE_TYPE_CONFIG.Gene.color,
      });
    }
    if (!nodesMap.has(pathwayId)) {
      nodesMap.set(pathwayId, {
        id: pathwayId,
        type: 'Pathway',
        label: chain.pathway,
        evidenceStrength: chain.evidenceStrength,
        val: chain.evidenceStrength * 5 + 3,
        color: NODE_TYPE_CONFIG.Pathway.color,
      });
    }
    if (!nodesMap.has(phaseId)) {
      nodesMap.set(phaseId, {
        id: phaseId,
        type: 'AgingPhase',
        label: PHASE_LABELS[chain.agingPhase] ?? chain.agingPhase,
        evidenceStrength: chain.evidenceStrength,
        val: 5,
        color: NODE_TYPE_CONFIG.AgingPhase.color,
      });
    }

    // Update evidence strength to max
    const existing = nodesMap.get(cpgId)!;
    if (chain.evidenceStrength > existing.evidenceStrength) {
      existing.evidenceStrength = chain.evidenceStrength;
      existing.val = chain.evidenceStrength * 6 + 2;
    }

    links.push({ source: cpgId, target: geneId, label: 'REGULATES' });
    links.push({ source: geneId, target: pathwayId, label: 'INVOLVED_IN' });
    links.push({ source: pathwayId, target: phaseId, label: 'ASSOCIATED_WITH' });
  }

  // Deduplicate links
  const linkSet = new Set<string>();
  const dedupedLinks = links.filter((l) => {
    const key = `${l.source}-${l.target}-${l.label}`;
    if (linkSet.has(key)) return false;
    linkSet.add(key);
    return true;
  });

  // Build adjacency for connected nodes
  const adjacency = new Map<string, { id: string; label: string; type: string; relation: string }[]>();
  for (const link of dedupedLinks) {
    const src = typeof link.source === 'string' ? link.source : (link.source as InternalNode).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as InternalNode).id;
    if (!adjacency.has(src)) adjacency.set(src, []);
    if (!adjacency.has(tgt)) adjacency.set(tgt, []);
    const srcNode = nodesMap.get(src)!;
    const tgtNode = nodesMap.get(tgt)!;
    adjacency.get(src)!.push({ id: tgt, label: tgtNode.label, type: tgtNode.type, relation: link.label });
    adjacency.get(tgt)!.push({ id: src, label: srcNode.label, type: srcNode.type, relation: link.label });
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links: dedupedLinks,
    adjacency,
    cpgBetaMap,
    cpgShapMap,
    pathwayInterventions,
  };
}

export default function KnowledgeGraphViz({ causalChains, onNodeSelect }: KnowledgeGraphVizProps) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    new Set(['CpG', 'Gene', 'Pathway', 'AgingPhase']),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const graphData = useMemo(() => buildGraphData(causalChains), [causalChains]);

  const filteredData = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    const filteredNodes = graphData.nodes.filter((n) => {
      if (!activeFilters.has(n.type)) return false;
      if (lowerSearch && !n.label.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = graphData.links.filter(
      (l) => nodeIds.has(l.source as string) && nodeIds.has(l.target as string),
    );
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, search, activeFilters]);

  const toggleFilter = (type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleNodeClick = useCallback(
    (node: InternalNode) => {
      setSelectedId(node.id);
      const graphNode: GraphNode = {
        id: node.id,
        type: node.type,
        label: node.label,
        evidenceStrength: node.evidenceStrength,
        connectedNodes: graphData.adjacency.get(node.id) ?? [],
      };
      if (node.type === 'CpG') {
        graphNode.betaValue = graphData.cpgBetaMap.get(node.label);
        graphNode.shapContributions = graphData.cpgShapMap.get(node.label);
      }
      if (node.type === 'Pathway') {
        graphNode.interventions = graphData.pathwayInterventions.get(node.label);
      }
      onNodeSelect(graphNode);
    },
    [graphData, onNodeSelect],
  );

  const nodeCanvasObject = useCallback(
    (node: InternalNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = node.val * 1.2;
      const isSelected = node.id === selectedId;

      // Glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = `${node.color}33`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? node.color : `${node.color}cc`;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(node.label, x, y + radius + 2);
    },
    [selectedId],
  );

  const linkCanvasObject = useCallback(
    (link: InternalLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const src = link.source as unknown as InternalNode;
      const tgt = link.target as unknown as InternalNode;
      if (!src.x || !tgt.x) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y!);
      ctx.lineTo(tgt.x, tgt.y!);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Edge label
      if (globalScale > 1.5) {
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y! + tgt.y!) / 2;
        const fontSize = Math.max(7 / globalScale, 2);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(link.label, midX, midY);
      }
    },
    [],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Search + Filters */}
      <div className="space-y-3 border-b border-surface-4 bg-surface-1 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-4 bg-surface-2 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition-colors focus:border-chronos-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(NODE_TYPE_CONFIG) as [NodeType, { color: string; label: string }][]).map(
            ([type, cfg]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  activeFilters.has(type)
                    ? 'text-white'
                    : 'border border-surface-4 bg-surface-2 text-gray-500',
                )}
                style={
                  activeFilters.has(type) ? { backgroundColor: `${cfg.color}33`, color: cfg.color } : undefined
                }
              >
                {cfg.label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative flex-1 bg-surface-0">
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={filteredData}
          nodeCanvasObject={nodeCanvasObject as any}
          linkCanvasObject={linkCanvasObject as any}
          onNodeClick={handleNodeClick as any}
          nodeRelSize={4}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => '#6366f1'}
          backgroundColor="#0a0a0f"
          cooldownTicks={100}
          d3VelocityDecay={0.3}
        />
      </div>
    </div>
  );
}
