import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, createWriteStream, createReadStream, unlinkSync, statSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline as streamPipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createInterface } from 'readline';
import { ChronosFactory } from './orchestration/factory.js';
import { MethylationParser } from './methylation/parser.js';
import { CpGEmbedder } from './methylation/embedder.js';
import type { TissueType, ArrayType, GenomicProfile } from './shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const DATA_DIR = path.resolve('./data');

// Ensure data directory exists on startup
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ============================================================
// Async startup — initialize CHRONOS with persistent stores
// ============================================================

async function startServer() {
  // Initialize with disk persistence (loads existing data)
  const { pipeline, registry, knowledgeGraph, temporalTracker, proofVerifier, ruvector } =
    await ChronosFactory.createAsync();

  // Auto-seed from bundled sample data if store is empty
  if (ruvector.methylationStore.count === 0) {
    const seedPath = path.resolve(__dirname, '../data/seed-samples.json');
    if (existsSync(seedPath)) {
      try {
        const seedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as Array<{
          id: string; vector: number[]; metadata: Record<string, unknown>;
        }>;
        await ruvector.methylationStore.ingest(seedData);
        console.log(`Auto-seeded ${seedData.length} samples from seed-samples.json`);
      } catch (err) {
        console.warn('Failed to auto-seed:', err);
      }
    }
  }

  const parser = new MethylationParser();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Serve React UI static files in production
  const uiDistPath = path.resolve(__dirname, '../ui/dist');
  app.use(express.static(uiDistPath));

  // Store runs in memory (production would use persistent storage)
  const runs = new Map<string, any>();

  // Genomics in-memory stores
  const genomicProfiles = new Map<string, GenomicProfile>();
  const biomarkerProcessors = new Map<string, any>();

  // Lazy-load genomics modules (created by another agent, may not exist yet)
  // Use string variable to prevent TypeScript from statically resolving the import
  let BiomarkerStreamProcessor: any = null;
  let genomicAnalyzer: any = null;
  try {
    const analyzerPath = './genomics/analyzer.js';
    const streamPath = './genomics/stream-processor.js';
    const genomicsModule = await import(/* @vite-ignore */ analyzerPath);
    genomicAnalyzer = new genomicsModule.GenomicAnalyzer();
    const streamModule = await import(/* @vite-ignore */ streamPath);
    BiomarkerStreamProcessor = streamModule.BiomarkerStreamProcessor;
    console.log('Genomics modules loaded successfully');
  } catch {
    console.log('Genomics modules not yet available — genomics endpoints will return 503');
  }

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

  // ============================================================
  // Inline GEO Data Ingest
  // ============================================================

  const DATASETS: Record<string, { url: string; description: string }> = {
    GSE40279: {
      url: 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE40nnn/GSE40279/matrix/GSE40279_series_matrix.txt.gz',
      description: 'Hannum et al. 656 whole blood samples, ages 19-101',
    },
    GSE87571: {
      url: 'https://ftp.ncbi.nlm.nih.gov/geo/series/GSE87nnn/GSE87571/matrix/GSE87571_series_matrix.txt.gz',
      description: '729 blood samples, ages 14-94',
    },
  };

  let ingestStatus: {
    running: boolean;
    dataset?: string;
    phase?: string;
    progress?: string;
    samplesIngested?: number;
    totalSamples?: number;
    probesProcessed?: number;
    error?: string;
    completedAt?: string;
  } = { running: false };

  // Trigger data ingest (downloads real GEO methylation data)
  app.post('/api/ingest', async (req, res) => {
    if (ingestStatus.running) {
      res.json({ status: 'already_running', ...ingestStatus });
      return;
    }

    const datasetId = (req.body?.dataset as string) ?? 'GSE40279';
    const dataset = DATASETS[datasetId];
    if (!dataset) {
      res.status(400).json({ error: `Unknown dataset: ${datasetId}. Available: ${Object.keys(DATASETS).join(', ')}` });
      return;
    }

    ingestStatus = {
      running: true,
      dataset: datasetId,
      phase: 'starting',
      progress: 'Initiating download...',
    };
    res.json({ status: 'started', message: `Ingesting ${datasetId} (${dataset.description}). Check /api/ingest/status for progress.` });

    // Run ingest in background (don't await in the request handler)
    runInlineIngest(datasetId, dataset, ruvector).catch((err) => {
      ingestStatus.running = false;
      ingestStatus.error = err instanceof Error ? err.message : String(err);
      ingestStatus.phase = 'failed';
      console.error('Ingest failed:', err);
    });
  });

  // Check ingest progress
  app.get('/api/ingest/status', (_req, res) => {
    res.json(ingestStatus);
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
      genomicProfiles: genomicProfiles.size,
      genomicsAvailable: genomicAnalyzer !== null,
      ruvector: {
        methylationStore: ruvector.methylationStore.count,
        patientStore: ruvector.patientStore.count,
        interventionStore: ruvector.interventionStore.count,
      },
    });
  });

  // ============================================================
  // Genomics API Routes
  // ============================================================

  // POST /api/genomics/analyze — Full 23andMe analysis
  app.post('/api/genomics/analyze', async (req, res) => {
    if (!genomicAnalyzer) {
      res.status(503).json({ error: 'Genomics module not available' });
      return;
    }
    try {
      const { rawText, subjectId } = req.body as { rawText?: string; subjectId?: string };
      if (!rawText || !subjectId) {
        res.status(400).json({ error: 'Missing rawText or subjectId' });
        return;
      }

      const profile: GenomicProfile = await genomicAnalyzer.analyze(rawText, subjectId);
      genomicProfiles.set(subjectId, profile);

      // Store profile vector in RuVector for similarity search
      if (ruvector && profile.profileVector?.length > 0) {
        const vec = new Float32Array(profile.profileVector);
        await ruvector.storeSampleEmbedding(`genomic-${subjectId}`, vec, {
          subjectId,
          chronologicalAge: 0,
          tissueType: 'whole_blood',
        });
      }

      res.json(profile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // GET /api/genomics/profile/:subjectId — Retrieve stored profile
  app.get('/api/genomics/profile/:subjectId', (req, res) => {
    const profile = genomicProfiles.get(req.params.subjectId);
    if (!profile) {
      res.status(404).json({ error: 'Genomic profile not found' });
      return;
    }
    res.json(profile);
  });

  // POST /api/genomics/biomarker — Process biomarker through stream anomaly detection
  app.post('/api/genomics/biomarker', (req, res) => {
    if (!BiomarkerStreamProcessor) {
      res.status(503).json({ error: 'Genomics module not available' });
      return;
    }
    try {
      const { subjectId, biomarkerId, value } = req.body as {
        subjectId?: string;
        biomarkerId?: string;
        value?: number;
      };
      if (!subjectId || !biomarkerId || value === undefined) {
        res.status(400).json({ error: 'Missing subjectId, biomarkerId, or value' });
        return;
      }

      const key = `${subjectId}:${biomarkerId}`;
      if (!biomarkerProcessors.has(key)) {
        biomarkerProcessors.set(key, new BiomarkerStreamProcessor(biomarkerId));
      }
      const processor = biomarkerProcessors.get(key)!;
      const result = processor.process(value);

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // GET /api/genomics/biomarker/:subjectId/summary — Streaming summary for subject
  app.get('/api/genomics/biomarker/:subjectId/summary', (req, res) => {
    const prefix = `${req.params.subjectId}:`;
    const summaries: Record<string, any> = {};
    for (const [key, processor] of biomarkerProcessors.entries()) {
      if (key.startsWith(prefix)) {
        const biomarkerId = key.slice(prefix.length);
        summaries[biomarkerId] = processor.summary?.() ?? processor.stats?.() ?? { count: 0 };
      }
    }
    if (Object.keys(summaries).length === 0) {
      res.status(404).json({ error: 'No biomarker data found for subject' });
      return;
    }
    res.json({ subjectId: req.params.subjectId, biomarkers: summaries });
  });

  // GET /api/genomics/drugs/:subjectId — Drug recommendations from stored CYP results
  app.get('/api/genomics/drugs/:subjectId', (req, res) => {
    const profile = genomicProfiles.get(req.params.subjectId);
    if (!profile) {
      res.status(404).json({ error: 'Genomic profile not found — run /api/genomics/analyze first' });
      return;
    }
    res.json({
      subjectId: req.params.subjectId,
      cyp2d6: profile.cyp2d6,
      cyp2c19: profile.cyp2c19,
      drugRecommendations: profile.drugRecommendations,
    });
  });

  // SPA fallback — serve React app for all non-API GET routes
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(uiDistPath, 'index.html'));
    } else {
      next();
    }
  });

  // ============================================================
  // Start Server
  // ============================================================

  app.listen(PORT, () => {
    console.log(`CHRONOS server running on http://localhost:${PORT}`);
    console.log(`  API: http://localhost:${PORT}/api/health`);
    console.log(`  UI:  http://localhost:${PORT}`);
    console.log(`  Clocks: ${registry.getAll().map(c => c.name).join(', ')}`);
    console.log(`  RuVector stores: methylation=${ruvector.methylationStore.count}, patient=${ruvector.patientStore.count}, intervention=${ruvector.interventionStore.count}`);
  });

  // ============================================================
  // Inline Ingest Implementation
  // ============================================================

  async function runInlineIngest(
    datasetId: string,
    dataset: { url: string; description: string },
    ruvectorSvc: typeof ruvector,
  ): Promise<void> {
    const gzPath = path.join(DATA_DIR, `${datasetId}_series_matrix.txt.gz`);
    const txtPath = path.join(DATA_DIR, `${datasetId}_series_matrix.txt`);

    // Step 1: Download if not cached
    if (!existsSync(gzPath) && !existsSync(txtPath)) {
      ingestStatus.phase = 'downloading';
      ingestStatus.progress = `Downloading ${datasetId} from NCBI GEO...`;
      console.log(ingestStatus.progress);

      const response = await fetch(dataset.url);
      if (!response.ok || !response.body) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      const fileStream = createWriteStream(gzPath);
      await streamPipeline(Readable.fromWeb(response.body as any), fileStream);
      ingestStatus.progress = `Downloaded to ${gzPath}`;
    }

    // Step 2: Decompress if needed
    if (existsSync(gzPath) && !existsSync(txtPath)) {
      ingestStatus.phase = 'decompressing';
      ingestStatus.progress = 'Decompressing...';
      console.log(ingestStatus.progress);
      await streamPipeline(createReadStream(gzPath), createGunzip(), createWriteStream(txtPath));
    }

    if (!existsSync(txtPath)) {
      throw new Error('Series matrix file not found after download/decompress');
    }

    // Step 3: PASS 1 — Extract metadata
    ingestStatus.phase = 'metadata';
    ingestStatus.progress = 'Extracting metadata...';
    console.log(ingestStatus.progress);

    const sampleIds: string[] = [];
    const ages: number[] = [];
    const sexes: string[] = [];
    let sampleCount = 0;
    let foundBetaStart = false;

    const rl1 = createInterface({
      input: createReadStream(txtPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl1) {
      if (line.startsWith('!Sample_geo_accession')) {
        const parts = line.split('\t').slice(1);
        sampleIds.push(...parts.map(s => s.replace(/"/g, '').trim()));
        sampleCount = sampleIds.length;
      }
      if (line.startsWith('!Sample_characteristics_ch1') && line.toLowerCase().includes('age')) {
        const parts = line.split('\t').slice(1);
        for (const part of parts) {
          const match = part.match(/(\d+\.?\d*)/);
          if (match) ages.push(parseFloat(match[1]));
        }
      }
      if (line.startsWith('!Sample_characteristics_ch1') && (line.toLowerCase().includes('sex') || line.toLowerCase().includes('gender'))) {
        const parts = line.split('\t').slice(1);
        for (const part of parts) {
          sexes.push(part.toLowerCase().includes('female') ? 'F' : 'M');
        }
      }
      if (line.startsWith('"ID_REF"') || line.startsWith('ID_REF')) {
        foundBetaStart = true;
        break;
      }
    }
    rl1.close();

    ingestStatus.totalSamples = sampleCount;
    ingestStatus.progress = `Found ${sampleCount} samples, ages ${ages.length > 0 ? `${Math.min(...ages)}-${Math.max(...ages)}` : 'unknown'}`;
    console.log(ingestStatus.progress);

    if (!foundBetaStart || sampleCount === 0) {
      throw new Error('Failed to find beta value matrix or sample IDs');
    }

    // Step 4: PASS 2 — Stream beta values and build embeddings
    ingestStatus.phase = 'embedding';
    ingestStatus.progress = 'Streaming beta values...';
    console.log(ingestStatus.progress);

    const CHUNK_SIZE = 10000;
    const embedder = new CpGEmbedder(CHUNK_SIZE, 256);

    const sampleBuffers: Float32Array[] = Array.from({ length: sampleCount }, () => new Float32Array(CHUNK_SIZE));
    const sampleBufferIdx = new Int32Array(sampleCount);
    const sampleEmbeddings: Float64Array[] = Array.from({ length: sampleCount }, () => new Float64Array(256));

    let probeCount = 0;
    let inBetaSection = false;

    const rl2 = createInterface({
      input: createReadStream(txtPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl2) {
      if (!inBetaSection) {
        if (line.startsWith('"ID_REF"') || line.startsWith('ID_REF')) {
          inBetaSection = true;
        }
        continue;
      }
      if (line.startsWith('!series_matrix_table_end') || line.trim() === '') break;

      const parts = line.split('\t');
      if (parts.length < 2) continue;

      for (let j = 1; j < parts.length && j - 1 < sampleCount; j++) {
        const val = parseFloat(parts[j].replace(/"/g, ''));
        const sIdx = j - 1;
        if (!isNaN(val) && val >= 0 && val <= 1) {
          const bufIdx = sampleBufferIdx[sIdx];
          sampleBuffers[sIdx][bufIdx] = val;
          sampleBufferIdx[sIdx] = bufIdx + 1;

          if (sampleBufferIdx[sIdx] >= CHUNK_SIZE) {
            const chunkEmb = embedder.embedRaw(sampleBuffers[sIdx]);
            for (let d = 0; d < 256; d++) {
              sampleEmbeddings[sIdx][d] += chunkEmb[d];
            }
            sampleBufferIdx[sIdx] = 0;
          }
        }
      }

      probeCount++;
      if (probeCount % 50000 === 0) {
        ingestStatus.probesProcessed = probeCount;
        ingestStatus.progress = `Processed ${probeCount} probes...`;
      }
    }
    rl2.close();

    // Flush remaining buffers
    for (let i = 0; i < sampleCount; i++) {
      if (sampleBufferIdx[i] > 0) {
        const padded = new Float32Array(CHUNK_SIZE);
        padded.set(sampleBuffers[i].slice(0, sampleBufferIdx[i]));
        const chunkEmb = embedder.embedRaw(padded);
        for (let d = 0; d < 256; d++) {
          sampleEmbeddings[i][d] += chunkEmb[d];
        }
      }
    }

    ingestStatus.probesProcessed = probeCount;

    // Step 5: Normalize and ingest into the server's RuVector store
    ingestStatus.phase = 'ingesting';
    ingestStatus.progress = `Ingesting ${sampleCount} samples into RuVector...`;
    console.log(ingestStatus.progress);

    let ingested = 0;
    for (let i = 0; i < sampleCount; i++) {
      const emb = new Float32Array(256);
      let norm = 0;
      for (let d = 0; d < 256; d++) {
        norm += sampleEmbeddings[i][d] * sampleEmbeddings[i][d];
      }
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (let d = 0; d < 256; d++) {
          emb[d] = sampleEmbeddings[i][d] / norm;
        }
      }

      await ruvectorSvc.storeSampleEmbedding(sampleIds[i] ?? `sample-${i}`, emb, {
        subjectId: `subject-${i}`,
        chronologicalAge: ages[i] ?? 0,
        tissueType: 'whole_blood',
      });

      ingested++;
      if (ingested % 100 === 0) {
        ingestStatus.samplesIngested = ingested;
        ingestStatus.progress = `Ingested ${ingested}/${sampleCount}`;
      }
    }

    // Cleanup decompressed file
    if (existsSync(txtPath)) {
      const sizeMB = (statSync(txtPath).size / 1024 / 1024).toFixed(0);
      console.log(`Cleaning up ${sizeMB} MB decompressed file...`);
      unlinkSync(txtPath);
    }

    // Mark complete
    ingestStatus.running = false;
    ingestStatus.phase = 'complete';
    ingestStatus.samplesIngested = ingested;
    ingestStatus.probesProcessed = probeCount;
    ingestStatus.completedAt = new Date().toISOString();
    ingestStatus.progress = `Complete: ${ingested} samples, ${probeCount} probes`;
    console.log(`Ingest complete: ${ingested} samples, ${probeCount} probes. Store count: ${ruvectorSvc.methylationStore.count}`);
  }
}

startServer().catch((err) => {
  console.error('Failed to start CHRONOS server:', err);
  process.exit(1);
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
