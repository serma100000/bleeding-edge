import { useState } from 'react';
import KnowledgeGraphViz from '@/components/knowledge/KnowledgeGraphViz';
import NodeDetailPanel, { type GraphNode } from '@/components/knowledge/NodeDetailPanel';
import { MOCK_CAUSAL_CHAINS } from '@/lib/mock-data';

export default function KnowledgePage() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="shrink-0 pb-4">
        <h1 className="font-display text-2xl font-bold text-gray-100">Knowledge Graph Explorer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explore the causal relationships between CpG sites, genes, pathways, and aging phases.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-surface-4">
        <div className="min-w-0 flex-1">
          <KnowledgeGraphViz
            causalChains={MOCK_CAUSAL_CHAINS}
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
