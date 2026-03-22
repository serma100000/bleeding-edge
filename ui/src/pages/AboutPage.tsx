import {
  Dna,
  Clock,
  ShieldCheck,
  Network,
  ExternalLink,
  FileText,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const FEATURES = [
  {
    icon: Clock,
    title: 'Multi-Clock Consensus',
    description:
      '4 deep learning clocks reach Byzantine fault-tolerant agreement on your biological age.',
  },
  {
    icon: ShieldCheck,
    title: 'Zero-Knowledge Proofs',
    description:
      'Cryptographic verification that your age prediction is correct without revealing your DNA data.',
  },
  {
    icon: Network,
    title: 'Knowledge Graph',
    description:
      'Vector-indexed CpG site relationships for personalized intervention recommendations.',
  },
] as const;

const TECH_STACK = [
  'RuVector',
  'rvDNA',
  'EZKL / Halo2',
  'Raft Consensus',
  'HNSW Indexing',
  'TypeScript + React',
  'Express',
  'Recharts',
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-chronos-primary-600 to-chronos-accent-600 p-5 shadow-lg shadow-chronos-primary-500/20">
          <Dna className="h-14 w-14 text-white" />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-100">
          CHRONOS
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
          Cryptographically Honest, Reproducible, Orchestrated Network for Omics-based Senescence
        </p>
        <span className="mt-3 font-mono text-xs text-gray-500">v0.2.0</span>
        <p className="mt-4 max-w-xl text-base font-medium text-chronos-accent-300">
          Verifiable epigenetic age prediction with zero-knowledge proofs
        </p>
      </section>

      {/* What It Does */}
      <section>
        <h2 className="mb-6 text-center font-display text-xl font-bold text-gray-100">
          What It Does
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} hover>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-xl bg-chronos-primary-500/10 p-3">
                  <Icon className="h-7 w-7 text-chronos-primary-400" />
                </div>
                <h3 className="font-display text-base font-semibold text-gray-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Technology Stack */}
      <section>
        <Card title="Technology Stack">
          <div className="flex flex-wrap gap-3">
            {TECH_STACK.map((tech) => (
              <Badge key={tech} variant="outline" className="px-4 py-1.5 text-sm">
                {tech}
              </Badge>
            ))}
          </div>
        </Card>
      </section>

      {/* The Science */}
      <section>
        <Card title="The Science">
          <p className="text-sm leading-relaxed text-gray-400">
            DNA methylation patterns at CpG sites serve as robust biomarkers of biological aging.
            CHRONOS runs four complementary epigenetic clocks &mdash; AltumAge, GrimAge,
            DeepStrataAge, and EpInflammAge &mdash; in parallel, reaching consensus via the Raft
            protocol. Zero-knowledge proofs generated via EZKL and Halo2 cryptographically attest
            that age predictions were computed correctly without exposing underlying genomic data.
          </p>
        </Card>
      </section>

      {/* Research Paper */}
      <section>
        <Card>
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-chronos-accent-500/10 p-2.5">
              <FileText className="h-5 w-5 text-chronos-accent-400" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-gray-100">
                Research Paper
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Full methodology, validation results, and cryptographic proof architecture.
              </p>
              <a
                href="https://github.com/serma100000/bleeding-edge/blob/master/docs/research/chronos-verifiable-epigenetic-aging.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-chronos-primary-400 transition-colors hover:text-chronos-primary-300"
              >
                Read the full research paper
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Card>
      </section>

      {/* Credits */}
      <section className="border-t border-surface-4 pt-8 text-center">
        <p className="text-sm text-gray-400">
          CHRONOS Project
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Open-source verifiable epigenetic age prediction
        </p>
      </section>
    </div>
  );
}
