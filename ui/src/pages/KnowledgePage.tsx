import { useState } from 'react';
import KnowledgeGraphViz from '@/components/knowledge/KnowledgeGraphViz';
import NodeDetailPanel, { type GraphNode } from '@/components/knowledge/NodeDetailPanel';
import { useApiData } from '@/hooks/useApi';
import { MOCK_CAUSAL_CHAINS } from '@/lib/mock-data';
import type { CausalChain } from '@/types/api';

export default function KnowledgePage() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const { data: chains, isLoading, error } = useApiData<CausalChain[]>(
    '/knowledge/chains',
    MOCK_CAUSAL_CHAINS,
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0 pb-4">
        <h1 className="font-display text-2xl font-bold text-gray-100">Knowledge Graph Explorer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explore the causal relationships between CpG sites, genes, pathways, and aging phases.
        </p>
        {isLoading && (
          <p className="mt-1 text-xs text-gray-600">Loading knowledge graph...</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-amber-500">
            Using demo data (API unavailable)
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-surface-4">
        <div className="min-w-0 flex-1">
          <KnowledgeGraphViz
            causalChains={chains}
            onNodeSelect={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
