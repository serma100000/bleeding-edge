#!/usr/bin/env tsx
/**
 * CHRONOS Data Ingest Script (Streaming)
 * Downloads real methylation data from NCBI GEO and ingests into RuVector.
 * Streams the file line-by-line to handle multi-GB files.
 *
 * Usage: npx tsx scripts/ingest-geo.ts [GSE40279|GSE87571]
 */

import { createWriteStream, createReadStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline as streamPipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createInterface } from 'readline';
import path from 'path';
import { CpGEmbedder } from '../src/methylation/embedder.js';
import { ChronosRuVectorService } from '../src/shared/ruvector-client.js';

const DATA_DIR = path.resolve('./data');
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

const datasetId = process.argv[2] ?? 'GSE40279';
const dataset = DATASETS[datasetId];

if (!dataset) {
  console.error(`Unknown dataset: ${datasetId}`);
  console.error(`Available: ${Object.keys(DATASETS).join(', ')}`);
  process.exit(1);
}

async function main() {
  console.log(`\n=== CHRONOS Data Ingest (Streaming) ===`);
  console.log(`Dataset: ${datasetId} — ${dataset.description}\n`);

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const gzPath = path.join(DATA_DIR, `${datasetId}_series_matrix.txt.gz`);
  const txtPath = path.join(DATA_DIR, `${datasetId}_series_matrix.txt`);

  // Step 1: Download if not cached
  if (!existsSync(gzPath) && !existsSync(txtPath)) {
    console.log(`Downloading ${datasetId} from NCBI GEO...`);
    const response = await fetch(dataset.url);
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    const fileStream = createWriteStream(gzPath);
    await streamPipeline(Readable.fromWeb(response.body as any), fileStream);
    console.log(`Downloaded to ${gzPath}`);
  }

  // Step 2: Decompress if needed
  if (existsSync(gzPath) && !existsSync(txtPath)) {
    console.log(`Decompressing...`);
    await streamPipeline(createReadStream(gzPath), createGunzip(), createWriteStream(txtPath));
    console.log(`Decompressed to ${txtPath}`);
  }

  if (existsSync(txtPath)) {
    const sizeMB = (statSync(txtPath).size / 1024 / 1024).toFixed(0);
    console.log(`Series matrix: ${sizeMB} MB`);
  }

  // Step 3: PASS 1 — Stream metadata headers only (first ~200 lines)
  console.log(`\nPass 1: Extracting metadata...`);
  const sampleIds: string[] = [];
  const ages: number[] = [];
  const sexes: string[] = [];
  let headerLine = '';
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
      headerLine = line;
      foundBetaStart = true;
      break; // Stop reading headers, beta data starts next
    }
  }
  rl1.close();

  console.log(`  Samples: ${sampleCount}`);
  console.log(`  Ages: ${ages.length > 0 ? `${Math.min(...ages)}-${Math.max(...ages)} years` : 'not found'}`);
  console.log(`  Sexes: ${sexes.length} entries`);

  if (!foundBetaStart || sampleCount === 0) {
    console.error('Failed to find beta value matrix or sample IDs.');
    process.exit(1);
  }

  // Step 4: PASS 2 — Stream beta values, accumulate per-sample running sums for embedding
  // Instead of storing all 485K betas per sample (too much memory for 656 samples),
  // we'll collect betas in chunks and embed incrementally.
  console.log(`\nPass 2: Streaming beta values and building embeddings...`);

  const CHUNK_SIZE = 10000; // Process 10K probes at a time
  const embedder = new CpGEmbedder(CHUNK_SIZE, 256); // Random projection on 10K-probe chunks
  const ruvector = new ChronosRuVectorService(DATA_DIR);
  await ruvector.initialize();

  // Accumulate beta values per sample in fixed-size buffers
  const sampleBuffers: Float32Array[] = Array.from({ length: sampleCount }, () => new Float32Array(CHUNK_SIZE));
  const sampleBufferIdx = new Int32Array(sampleCount); // Current position in each buffer
  const sampleEmbeddings: Float64Array[] = Array.from({ length: sampleCount }, () => new Float64Array(256));

  let probeCount = 0;
  let inBetaSection = false;
  let chunksProcessed = 0;

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

    if (line.startsWith('!series_matrix_table_end') || line.trim() === '') {
      break;
    }

    const parts = line.split('\t');
    if (parts.length < 2) continue;

    // Parse beta values for each sample
    for (let j = 1; j < parts.length && j - 1 < sampleCount; j++) {
      const val = parseFloat(parts[j].replace(/"/g, ''));
      const sIdx = j - 1;
      if (!isNaN(val) && val >= 0 && val <= 1) {
        const bufIdx = sampleBufferIdx[sIdx];
        sampleBuffers[sIdx][bufIdx] = val;
        sampleBufferIdx[sIdx] = bufIdx + 1;

        // When buffer is full, embed the chunk and accumulate
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
      console.log(`  Processed ${probeCount} probes...`);
    }
  }
  rl2.close();

  // Flush remaining buffers
  for (let i = 0; i < sampleCount; i++) {
    if (sampleBufferIdx[i] > 0) {
      const partial = sampleBuffers[i].slice(0, sampleBufferIdx[i]);
      // Pad to embedder input size
      const padded = new Float32Array(CHUNK_SIZE);
      padded.set(partial);
      const chunkEmb = embedder.embedRaw(padded);
      for (let d = 0; d < 256; d++) {
        sampleEmbeddings[i][d] += chunkEmb[d];
      }
    }
  }

  console.log(`  Total probes: ${probeCount}`);

  // Step 5: Normalize embeddings and ingest into RuVector
  console.log(`\nIngesting ${sampleCount} samples into RuVector...`);
  let ingested = 0;

  for (let i = 0; i < sampleCount; i++) {
    // L2 normalize the accumulated embedding
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

    await ruvector.storeSampleEmbedding(sampleIds[i] ?? `sample-${i}`, emb, {
      subjectId: `subject-${i}`,
      chronologicalAge: ages[i] ?? 0,
      tissueType: 'whole_blood',
    });

    ingested++;
    if (ingested % 100 === 0) {
      console.log(`  Ingested ${ingested}/${sampleCount}`);
    }
  }

  console.log(`\n=== Ingest Complete ===`);
  console.log(`  Probes processed: ${probeCount}`);
  console.log(`  Samples ingested: ${ingested}`);
  console.log(`  RuVector store: ${ruvector.methylationStore.count} entries`);

  // Cleanup decompressed file
  if (existsSync(txtPath)) {
    const sizeMB = (statSync(txtPath).size / 1024 / 1024).toFixed(0);
    console.log(`\nCleaning up ${sizeMB} MB decompressed file...`);
    unlinkSync(txtPath);
  }

  console.log(`Done.\n`);
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
