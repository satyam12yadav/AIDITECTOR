import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsxPkg from 'xlsx';
import { embeddingService } from './embeddingService.js';

const XLSX = (xlsxPkg as any).default || xlsxPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type DatasetMatchStrength = 'HIGH' | 'MEDIUM' | 'LOW';

export interface NearestExample {
  id: string;
  label: 'FAKE' | 'REAL';
  title: string;
  similarity: number;
}

export interface DatasetSimilarityResult {
  datasetMatch: DatasetMatchStrength;
  nearestExamples: NearestExample[];
  fakeSimilarity: number;
  realSimilarity: number;
  nearestLabel: 'FAKE' | 'REAL';
  summary: string;
}

export interface DatasetVectorItem {
  id: string;
  label: 'FAKE' | 'REAL';
  title: string;
  text: string;
  embedding: number[];
}

export interface DatasetVectorIndex {
  version: string;
  createdAt: string;
  totalRows: number;
  validExamples: number;
  duplicatesRemoved: number;
  labelDistribution: {
    fake: number;
    real: number;
  };
  items: DatasetVectorItem[];
}

// Configurable thresholds for semantic similarity matching
export const SIMILARITY_THRESHOLDS = {
  HIGH: 0.78,
  MEDIUM: 0.50,
};

export class DatasetSimilarityService {
  private vectorIndex: DatasetVectorIndex | null = null;
  private indexPath: string = path.resolve(__dirname, '../data/datasetVectorIndex.json');

  constructor() {
    this.initializeIndex();
  }

  /**
   * Initializes or loads the persistent vector index
   */
  public async initializeIndex(): Promise<void> {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        this.vectorIndex = JSON.parse(raw);
        console.log(`[DatasetSimilarity] Loaded ${this.vectorIndex?.items.length || 0} precomputed vector embeddings.`);
      } else {
        console.log('[DatasetSimilarity] Vector index not found on disk. Building new index...');
        await this.buildAndSaveIndex();
      }
    } catch (err) {
      console.warn('[DatasetSimilarity] Error loading index, rebuilding:', err);
      await this.buildAndSaveIndex();
    }
  }

  /**
   * Discovers and parses dataset files (CSV, XLSX, JSON)
   */
  public loadRawDataset(): { items: { id: string; title: string; text: string; label: 'FAKE' | 'REAL' }[]; totalRows: number; duplicatesRemoved: number } {
    const possiblePaths = [
      path.resolve(process.cwd(), 'data/fakeNewsDataset.csv'),
      path.resolve(process.cwd(), 'data/fakeNewsDataset.xlsx'),
      path.resolve(process.cwd(), 'data/fakeNewsDataset.json'),
      path.resolve(process.cwd(), 'data/news.csv'),
      path.resolve(process.cwd(), 'data/train.csv'),
      path.resolve(__dirname, '../data/fakeNewsDataset.json'),
    ];

    let foundPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      console.warn('[DatasetSimilarity] No dataset file found. Using default seed dataset.');
      foundPath = path.resolve(__dirname, '../data/fakeNewsDataset.json');
    }

    let rawRecords: any[] = [];
    if (foundPath.endsWith('.json')) {
      const raw = fs.readFileSync(foundPath, 'utf-8');
      rawRecords = JSON.parse(raw);
    } else if (foundPath.endsWith('.xlsx') || foundPath.endsWith('.xls') || foundPath.endsWith('.csv')) {
      const buf = fs.readFileSync(foundPath);
      const workbook = XLSX.read(buf, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRecords = XLSX.utils.sheet_to_json(firstSheet);
    }

    const totalRows = rawRecords.length;
    const seenTexts = new Set<string>();
    const cleanedItems: { id: string; title: string; text: string; label: 'FAKE' | 'REAL' }[] = [];
    let duplicatesRemoved = 0;

    rawRecords.forEach((row, idx) => {
      const title = this.extractField(row, ['title', 'headline', 'news_title', 'claim', 'heading', 'name']) || '';
      const text = this.extractField(row, ['text', 'article', 'content', 'body', 'article_text', 'news_text', 'claim_text', 'statement', 'details']) || title;
      const rawLabel = this.extractField(row, ['label', 'class', 'target', 'is_fake', 'category', 'verdict', 'truth_value', 'status']) || 'FAKE';
      const id = this.extractField(row, ['id', 'article_id', 'news_id', 'index', '_id']) || `fn-${idx + 1}`;

      const normalizedText = (text || title || '').trim();
      if (!normalizedText) return;

      const dedupeKey = normalizedText.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
      if (seenTexts.has(dedupeKey)) {
        duplicatesRemoved++;
        return;
      }
      seenTexts.add(dedupeKey);

      const label = this.normalizeLabel(rawLabel);
      cleanedItems.push({
        id: String(id),
        title: title || normalizedText.slice(0, 60),
        text: normalizedText,
        label,
      });
    });

    return {
      items: cleanedItems,
      totalRows,
      duplicatesRemoved,
    };
  }

  /**
   * Precomputes embeddings and writes persistent vector index
   */
  public async buildAndSaveIndex(): Promise<DatasetVectorIndex> {
    const { items, totalRows, duplicatesRemoved } = this.loadRawDataset();

    const vectorItems: DatasetVectorItem[] = [];
    let fakeCount = 0;
    let realCount = 0;

    for (const item of items) {
      const embeddingText = `${item.title}\n${item.text}`.trim();
      const embedding = await embeddingService.embedText(embeddingText);

      if (item.label === 'FAKE') fakeCount++;
      else realCount++;

      vectorItems.push({
        id: item.id,
        label: item.label,
        title: item.title,
        text: item.text,
        embedding,
      });
    }

    const index: DatasetVectorIndex = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      totalRows,
      validExamples: vectorItems.length,
      duplicatesRemoved,
      labelDistribution: {
        fake: fakeCount,
        real: realCount,
      },
      items: vectorItems,
    };

    // Save to disk
    fs.mkdirSync(path.dirname(this.indexPath), { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    this.vectorIndex = index;

    console.log(`[DatasetSimilarity] Successfully indexed ${vectorItems.length} examples (${fakeCount} FAKE, ${realCount} REAL).`);
    return index;
  }

  /**
   * Finds the Top-K nearest dataset examples for a user query/article text
   */
  public async searchNearest(queryText: string, k = 5): Promise<DatasetSimilarityResult> {
    if (!queryText || queryText.trim().length === 0) {
      return {
        datasetMatch: 'LOW',
        nearestExamples: [],
        fakeSimilarity: 0.0,
        realSimilarity: 0.0,
        nearestLabel: 'FAKE',
        summary: 'No input text provided for similarity calculation.',
      };
    }

    if (!this.vectorIndex || this.vectorIndex.items.length === 0) {
      await this.initializeIndex();
    }

    const queryEmbedding = await embeddingService.embedText(queryText);

    // If dimension mismatch with in-memory cached index, reload index from disk or rebuild
    if (this.vectorIndex && this.vectorIndex.items.length > 0 && this.vectorIndex.items[0].embedding.length !== queryEmbedding.length) {
      await this.initializeIndex();
    }

    const items = this.vectorIndex?.items || [];

    const scoredItems = items.map((item) => {
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, item.embedding);
      return {
        id: item.id,
        label: item.label,
        title: item.title,
        similarity: Math.max(0.0, similarity), // Normalized 0.0 - 1.0
      };
    });

    // Sort descending by similarity
    scoredItems.sort((a, b) => b.similarity - a.similarity);

    const topK = scoredItems.slice(0, Math.max(1, k));

    // Calculate fake vs real maximum and weighted similarity
    const fakeMatches = topK.filter((e) => e.label === 'FAKE');
    const realMatches = topK.filter((e) => e.label === 'REAL');

    const maxFakeSim = fakeMatches.length > 0 ? Math.max(...fakeMatches.map((m) => m.similarity)) : 0.0;
    const maxRealSim = realMatches.length > 0 ? Math.max(...realMatches.map((m) => m.similarity)) : 0.0;
    const maxSim = topK.length > 0 ? topK[0].similarity : 0.0;

    let datasetMatch: DatasetMatchStrength = 'LOW';
    if (maxSim >= SIMILARITY_THRESHOLDS.HIGH) {
      datasetMatch = 'HIGH';
    } else if (maxSim >= SIMILARITY_THRESHOLDS.MEDIUM) {
      datasetMatch = 'MEDIUM';
    } else {
      datasetMatch = 'LOW';
    }

    const nearestLabel = topK.length > 0 ? topK[0].label : 'FAKE';

    let summary = '';
    if (datasetMatch === 'HIGH') {
      summary = `High semantic similarity (${Math.round(maxSim * 100)}%) to previously documented ${nearestLabel} articles in dataset.`;
    } else if (datasetMatch === 'MEDIUM') {
      summary = `Moderate semantic similarity (${Math.round(maxSim * 100)}%) to related topics in dataset.`;
    } else {
      summary = `Low semantic similarity (${Math.round(maxSim * 100)}%) across historical dataset archives.`;
    }

    // Development Debug Logging (Requirement 14)
    this.logDebugSummary(queryText, topK, datasetMatch, maxFakeSim, maxRealSim, summary);

    return {
      datasetMatch,
      nearestExamples: topK,
      fakeSimilarity: Math.round(maxFakeSim * 100) / 100,
      realSimilarity: Math.round(maxRealSim * 100) / 100,
      nearestLabel,
      summary,
    };
  }

  /**
   * Helper to extract field case-insensitively from arbitrary row object
   */
  private extractField(row: any, candidates: string[]): string | null {
    if (!row || typeof row !== 'object') return null;
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const matchKey = keys.find((k) => k.toLowerCase().trim() === cand.toLowerCase());
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
        return String(row[matchKey]).trim();
      }
    }
    return null;
  }

  /**
   * Normalizes dataset labels into 'FAKE' | 'REAL'
   */
  public normalizeLabel(rawLabel: any): 'FAKE' | 'REAL' {
    const clean = String(rawLabel).toLowerCase().trim();
    if (['fake', '0', 'false', 'unreliable', 'hoax', 'fabricated', 'misleading', 'rumor', 'disputed'].includes(clean)) {
      return 'FAKE';
    }
    if (['real', '1', 'true', 'reliable', 'authentic', 'verified', 'factual', 'news', 'credible'].includes(clean)) {
      return 'REAL';
    }
    return 'FAKE';
  }

  /**
   * Development Debug Logging (Requirement 14)
   */
  private logDebugSummary(
    queryText: string,
    topMatches: NearestExample[],
    matchStrength: DatasetMatchStrength,
    fakeSim: number,
    realSim: number,
    summary: string
  ): void {
    console.log('\n============================================================');
    console.log('📊 [PHASE 3: FAKE NEWS DATASET SIMILARITY DEBUG]');
    console.log('============================================================');
    console.log(`QUERY: "${queryText.slice(0, 100)}${queryText.length > 100 ? '...' : ''}"`);
    console.log('TOP MATCHES:');
    topMatches.forEach((m, i) => {
      console.log(`  ${i + 1}. [${m.label}] — similarity: ${m.similarity.toFixed(2)} | "${m.title}"`);
    });
    console.log(`\nDATASET MATCH STRENGTH: ${matchStrength}`);
    console.log(`FAKE SIMILARITY: ${fakeSim.toFixed(2)} | REAL SIMILARITY: ${realSim.toFixed(2)}`);
    console.log(`SUMMARY: ${summary}`);
    console.log('NOTE: Dataset similarity is a pattern signal only; does not determine truth or credibility.');
    console.log('============================================================\n');
  }
}

export const datasetSimilarityService = new DatasetSimilarityService();
export default datasetSimilarityService;
