import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChronosFactory } from './orchestration/factory.js';
import { MethylationParser } from './methylation/parser.js';
import type { TissueType, ArrayType } from './shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// Initialize CHRONOS
const { pipeline, registry, knowledgeGraph, temporalTracker, proofVerifier, ruvector } = ChronosFactory.create();
const parser = new MethylationParser();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve React UI static files in production
const uiDistPath = path.resolve(__dirname, '../ui/dist');
app.use(express.static(uiDistPath));

// Store runs in memory (production would use persistent storage)
const runs = new Map<string, any>();

// ============================================================
// API Routes
// ============================================================

// Submit a methylation sample for analysis
app.post('/api/submit', async (req, res) => {
  try {
    const { csvData, metadata } = req.body as {
      csvData: string;
      metadata: {
        chronologicalAge: number;
        sex: string;
        tissueType?: string;
        arrayType?: string;
      };
    };

    if (!csvData || !metadata?.chronologicalAge || !metadata?.sex) {
      res.status(400).json({ error: 'Missing csvData, chronologicalAge, or sex' });
      return;
    }

    const sample = parser.parseSingleSampleCsv(csvData, {
      sampleId: 'sample-' + Date.now(),
      subjectId: 'subject-' + Date.now(),
      tissueType: (metadata.tissueType ?? 'whole_blood') as TissueType,
      arrayType: (metadata.arrayType ?? 'illumina_450k') as ArrayType,
      metadata: {
        chronologicalAge: metadata.chronologicalAge,
        sex: metadata.sex as 'M' | 'F',
        tissueSource: metadata.tissueType ?? 'whole_blood',
        collectionDate: new Date().toISOString(),
      },
      qcMetrics: {
        meanDetectionP: 0.001,
        probesPassedQC: csvData.trim().split('\n').length,
        totalProbes: csvData.trim().split('\n').length,
        bisulfiteConversion: 0.98,
      },
    });

    // Run pipeline async
    const runPromise = pipeline.runPipeline(sample);

    // Return runId immediately
    runPromise.then((run) => {
      runs.set(run.runId, serializeRun(run));
    });

    // For now, wait for completion (fast enough with simulated clocks)
    const run = await runPromise;
    runs.set(run.runId, serializeRun(run));

    res.json({ runId: run.runId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: message });
  }
});

// Get pipeline result
app.get('/api/result/:runId', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

// List all runs
app.get('/api/results', (_req, res) => {
  const allRuns = Array.from(runs.values()).sort(
    (a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  res.json(allRuns);
});

// Verify a ZK proof
app.post('/api/verify', (req, res) => {
  try {
    const { proof } = req.body;
    if (!proof) {
      res.status(400).json({ error: 'Missing proof' });
      return;
    }
    const valid = proofVerifier.verify(proof);
    res.json({ valid });
  } catch {
    res.json({ valid: false });
  }
});

// Query knowledge graph
app.get('/api/knowledge/chains', (_req, res) => {
  // Return all causal chains from the knowledge graph
  const allCpGs = [
    'cg16867657', 'cg06639320', 'cg00481951', 'cg22454769',
    'cg07553761', 'cg24724428', 'cg10523019', 'cg01459453',
    'cg15804973', 'cg03286783',
  ];
  const chains = allCpGs.flatMap(cpg => knowledgeGraph.queryCausalChain(cpg));
  res.json(chains);
});

// Get trajectory for a subject
app.get('/api/trajectory/:subjectId', (req, res) => {
  const trajectory = temporalTracker.getTrajectory(req.params.subjectId);
  const velocity = temporalTracker.getVelocity(req.params.subjectId);
  const anomaly = temporalTracker.detectAnomaly(req.params.subjectId);

  res.json({
    points: trajectory.map(tp => ({
      timestamp: tp.timestamp.toISOString(),
      biologicalAge: tp.consensusAge.consensusBiologicalAge,
      chronologicalAge: tp.consensusAge.clockResults[0]?.chronologicalAge ?? 0,
      confidenceInterval: tp.consensusAge.confidenceInterval,
    })),
    velocity,
    anomaly,
  });
});

// Trigger data ingest (downloads real GEO methylation data)
let ingestRunning = false;
app.post('/api/ingest', async (_req, res) => {
  if (ingestRunning) {
    res.json({ status: 'already_running' });
    return;
  }
  ingestRunning = true;
  res.json({ status: 'started', message: 'Ingesting GSE40279 (656 samples). This takes several minutes.' });

  // Run ingest in background (don't await in the request handler)
  import('child_process').then(({ exec }) => {
    exec('npx tsx scripts/ingest-geo.ts GSE40279', { cwd: process.cwd() }, (err, stdout, stderr) => {
      ingestRunning = false;
      if (err) console.error('Ingest failed:', stderr);
      else console.log('Ingest complete:', stdout.slice(-200));
    });
  });
});

// Get available clocks
app.get('/api/clocks', (_req, res) => {
  const clocks = registry.getAll().map(c => ({
    name: c.name,
    mae: c.mae,
    modelHash: c.getModelHash(),
  }));
  res.json(clocks);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    clocks: registry.getAll().length,
    runs: runs.size,
    ruvector: {
      methylationStore: ruvector.methylationStore.count,
      patientStore: ruvector.patientStore.count,
      interventionStore: ruvector.interventionStore.count,
    },
  });
});

// SPA fallback — serve React app for all non-API routes
app.use((_req, res) => {
  res.sendFile(path.join(uiDistPath, 'index.html'));
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
  console.log(`CHRONOS server running on http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/health`);
  console.log(`  UI:  http://localhost:${PORT}`);
  console.log(`  Clocks: ${registry.getAll().map(c => c.name).join(', ')}`);
});

// ============================================================
// Helpers
// ============================================================

function serializeRun(run: any): any {
  return {
    ...run,
    startedAt: run.startedAt instanceof Date ? run.startedAt.toISOString() : run.startedAt,
    completedAt: run.completedAt instanceof Date ? run.completedAt.toISOString() : run.completedAt,
    chronologicalAge: run.methylationSample?.metadata?.chronologicalAge ?? 0,
    embedding: undefined, // Don't send raw embedding to client
    methylationSample: undefined, // Don't send raw methylation data to client
    proof: run.proof ? {
      ...run.proof,
      proofBytes: Buffer.from(run.proof.proofBytes).toString('base64'),
      verificationKey: Buffer.from(run.proof.verificationKey).toString('base64'),
    } : undefined,
  };
}
