// CHRONOS Orchestration Context — Factory (Composition Root)
// Wires up all bounded contexts with their dependencies

import { InMemoryEventBus } from '../shared/event-bus.js';
import { CpGEmbedder } from '../methylation/embedder.js';
import { AltumAgeClock } from '../clocks/altumage.js';
import { GrimAgeClock } from '../clocks/grimage.js';
import { DeepStrataAgeClock } from '../clocks/deepstrataage.js';
import { EpInflammAgeClock } from '../clocks/epinflamm.js';
import { ClockRegistry } from '../clocks/registry.js';
import { ClockConsensus } from '../clocks/consensus.js';
import { CircuitCompiler } from '../proofs/circuit-compiler.js';
import { WitnessGenerator } from '../proofs/witness-generator.js';
import { ProofGenerator } from '../proofs/proof-generator.js';
import { ProofVerifier } from '../proofs/proof-verifier.js';
import { AgingKnowledgeGraph } from '../knowledge/knowledge-graph.js';
import { InterventionRecommender } from '../knowledge/recommender.js';
import { TemporalTracker } from '../knowledge/temporal-tracker.js';
import { ChronosPipeline } from './pipeline.js';
import { ChronosRuVectorService } from '../shared/ruvector-client.js';

const DEFAULT_INPUT_DIM = 25000;
const DEFAULT_EMBEDDING_DIM = 256;
const DEFAULT_DATA_DIR = './data';

export interface ChronosComponents {
  pipeline: ChronosPipeline;
  registry: ClockRegistry;
  knowledgeGraph: AgingKnowledgeGraph;
  temporalTracker: TemporalTracker;
  eventBus: InMemoryEventBus;
  proofVerifier: ProofVerifier;
  ruvector: ChronosRuVectorService;
}

export class ChronosFactory {
  static create(): ChronosComponents {
    // Shared infrastructure
    const eventBus = new InMemoryEventBus();

    // Methylation context
    const embedder = new CpGEmbedder(DEFAULT_INPUT_DIM, DEFAULT_EMBEDDING_DIM);

    // Clocks context
    const altumage = new AltumAgeClock();
    const grimage = new GrimAgeClock();
    const deepstrata = new DeepStrataAgeClock();
    const epinflamm = new EpInflammAgeClock();

    const registry = new ClockRegistry();
    registry.register(altumage);
    registry.register(grimage);
    registry.register(deepstrata);
    registry.register(epinflamm);

    const consensus = new ClockConsensus();

    // Proofs context
    const circuitCompiler = new CircuitCompiler();
    const witnessGenerator = new WitnessGenerator();
    const proofGenerator = new ProofGenerator();
    const proofVerifier = new ProofVerifier();

    // Knowledge context
    const knowledgeGraph = new AgingKnowledgeGraph();
    const recommender = new InterventionRecommender();
    const temporalTracker = new TemporalTracker();

    // RuVector integration
    const ruvector = new ChronosRuVectorService(DEFAULT_DATA_DIR);

    // Orchestration
    const pipeline = new ChronosPipeline({
      embedder,
      clocks: registry.getAll(),
      consensus,
      circuitCompiler,
      witnessGenerator,
      proofGenerator,
      knowledgeGraph,
      recommender,
      temporalTracker,
      ruvector,
    });

    return {
      pipeline,
      registry,
      knowledgeGraph,
      temporalTracker,
      eventBus,
      proofVerifier,
      ruvector,
    };
  }
}
