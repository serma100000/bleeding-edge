import { useState } from 'react';
import {
  Settings,
  Database,
  Info,
  Network,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import type { ClockName } from '@/types/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Slider from '@/components/ui/Slider';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrataAge',
  epinflamm: 'EpInflamm',
};

const SETTINGS_TABS = [
  { id: 'clocks', label: 'Clock Configuration' },
  { id: 'hnsw', label: 'HNSW Parameters' },
  { id: 'system', label: 'System Info' },
  { id: 'about', label: 'About' },
];

interface ClockWeights {
  altumage: number;
  grimage: number;
  deepstrataage: number;
  epinflamm: number;
}

interface HnswParams {
  m: number;
  efConstruction: number;
  efSearch: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('clocks');
  const [saving, setSaving] = useState(false);

  const [clockWeights, setClockWeights] = useState<ClockWeights>({
    altumage: 0.3,
    grimage: 0.3,
    deepstrataage: 0.25,
    epinflamm: 0.15,
  });
  const [epsilon, setEpsilon] = useState('2.0');

  const [hnswParams, setHnswParams] = useState<HnswParams>({
    m: 16,
    efConstruction: 200,
    efSearch: 100,
  });

  const handleSave = async () => {
    setSaving(true);
    // Mock save delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
  };

  const updateClockWeight = (clock: ClockName, value: number) => {
    setClockWeights((prev) => ({ ...prev, [clock]: value }));
  };

  const updateHnswParam = (param: keyof HnswParams, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setHnswParams((prev) => ({ ...prev, [param]: numValue }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-chronos-primary-500/10 p-2.5">
            <Settings className="h-6 w-6 text-chronos-primary-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-100">Settings</h1>
            <p className="text-sm text-gray-500">
              Configure pipeline parameters and system preferences
            </p>
          </div>
        </div>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          Save Changes
        </Button>
      </div>

      <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'clocks' && (
          <ClockConfigSection
            weights={clockWeights}
            epsilon={epsilon}
            onWeightChange={updateClockWeight}
            onEpsilonChange={setEpsilon}
          />
        )}
        {activeTab === 'hnsw' && (
          <HnswSection params={hnswParams} onParamChange={updateHnswParam} />
        )}
        {activeTab === 'system' && <SystemInfoSection />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

/* ---------- Clock Configuration ---------- */

interface ClockConfigProps {
  weights: ClockWeights;
  epsilon: string;
  onWeightChange: (clock: ClockName, value: number) => void;
  onEpsilonChange: (value: string) => void;
}

function ClockConfigSection({ weights, epsilon, onWeightChange, onEpsilonChange }: ClockConfigProps) {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="space-y-6">
      <Card title="Clock Weights" action={
        <span className="text-xs text-gray-500">
          Total: <span className={totalWeight > 1.01 || totalWeight < 0.99 ? 'text-red-400' : 'text-chronos-younger'}>
            {totalWeight.toFixed(2)}
          </span>
        </span>
      }>
        <p className="mb-6 text-sm text-gray-500">
          Adjust the weight of each epigenetic clock in the consensus calculation.
          Weights should sum to 1.0.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {(Object.keys(CLOCK_LABELS) as ClockName[]).map((clock) => (
            <Slider
              key={clock}
              label={CLOCK_LABELS[clock]}
              value={weights[clock]}
              onChange={(v) => onWeightChange(clock, v)}
              min={0}
              max={1}
              step={0.05}
            />
          ))}
        </div>
      </Card>

      <Card title="Consensus Tolerance">
        <p className="mb-4 text-sm text-gray-500">
          Epsilon tolerance for Raft consensus convergence between clocks (years).
        </p>
        <div className="max-w-xs">
          <Input
            label="Epsilon (years)"
            type="number"
            value={epsilon}
            onChange={(e) => onEpsilonChange(e.target.value)}
            min={0.1}
            max={10}
            step={0.1}
          />
        </div>
      </Card>
    </div>
  );
}

/* ---------- HNSW Parameters ---------- */

interface HnswSectionProps {
  params: HnswParams;
  onParamChange: (param: keyof HnswParams, value: string) => void;
}

function HnswSection({ params, onParamChange }: HnswSectionProps) {
  return (
    <Card title="HNSW Index Parameters" action={
      <Badge variant="outline">RuVector</Badge>
    }>
      <p className="mb-6 text-sm text-gray-500">
        Configure the Hierarchical Navigable Small World graph parameters for
        similarity search in the intervention recommendation engine.
      </p>
      <div className="grid gap-6 sm:grid-cols-3">
        <Input
          label="M (Max Connections)"
          type="number"
          value={params.m}
          onChange={(e) => onParamChange('m', e.target.value)}
          min={4}
          max={64}
        />
        <Input
          label="efConstruction"
          type="number"
          value={params.efConstruction}
          onChange={(e) => onParamChange('efConstruction', e.target.value)}
          min={50}
          max={500}
        />
        <Input
          label="efSearch"
          type="number"
          value={params.efSearch}
          onChange={(e) => onParamChange('efSearch', e.target.value)}
          min={10}
          max={500}
        />
      </div>
      <div className="mt-6 rounded-lg bg-surface-1 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Parameter Guide
        </h4>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>
            <span className="font-medium text-gray-400">M</span> - Number of
            bi-directional links per node. Higher = better recall, more memory.
          </li>
          <li>
            <span className="font-medium text-gray-400">efConstruction</span> -
            Build-time search depth. Higher = better index quality, slower build.
          </li>
          <li>
            <span className="font-medium text-gray-400">efSearch</span> -
            Query-time search depth. Higher = better recall, slower queries.
          </li>
        </ul>
      </div>
    </Card>
  );
}

/* ---------- System Info ---------- */

interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'degraded';
  version: string;
}

const SERVICES: ServiceStatus[] = [
  { name: 'RuVector', status: 'connected', version: 'v2.4.0' },
  { name: 'RuFlo', status: 'connected', version: 'v3.1.0' },
  { name: 'EZKL', status: 'connected', version: 'v0.12.0' },
];

function SystemInfoSection() {
  return (
    <div className="space-y-6">
      <Card title="Service Status">
        <div className="divide-y divide-surface-4">
          {SERVICES.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface-3 p-2">
                  {service.name === 'RuVector' && <Database className="h-4 w-4 text-chronos-accent-400" />}
                  {service.name === 'RuFlo' && <Network className="h-4 w-4 text-chronos-primary-400" />}
                  {service.name === 'EZKL' && <CheckCircle className="h-4 w-4 text-chronos-verified-DEFAULT" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.version}</p>
                </div>
              </div>
              <Badge variant="younger">Connected</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Runtime Environment">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Node.js', value: 'v20.11.0' },
            { label: 'WASM Runtime', value: 'wasmtime 18.0' },
            { label: 'Consensus', value: 'Raft (4 clocks)' },
            { label: 'Proof System', value: 'EZKL (Halo2)' },
            { label: 'Vector Index', value: 'HNSW (RuVector)' },
            { label: 'Embedding Model', value: 'all-MiniLM-L6-v2' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between rounded-lg bg-surface-1 px-4 py-3">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="font-mono text-sm text-gray-300">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- About ---------- */

function AboutSection() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-xl bg-gradient-to-br from-chronos-primary-600 to-chronos-accent-600 p-4">
          <Info className="h-8 w-8 text-white" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-100">CHRONOS</h2>
        <p className="mt-1 font-mono text-sm text-gray-500">v0.1.0-alpha</p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
          Privacy-preserving biological age estimation using multi-clock epigenetic
          consensus with zero-knowledge proofs. Powered by RuVector HNSW indexing
          and Raft-based clock consensus.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="https://github.com/ruvnet/chronos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-surface-4 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="https://github.com/ruvnet/chronos/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-surface-4 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Documentation
          </a>
          <a
            href="https://github.com/ruvnet/claude-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-surface-4 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Claude Flow
          </a>
        </div>

        <div className="mt-8 border-t border-surface-4 pt-6">
          <p className="text-xs text-gray-600">
            Built with React, RuVector, EZKL, and Claude Flow.
          </p>
        </div>
      </div>
    </Card>
  );
}
