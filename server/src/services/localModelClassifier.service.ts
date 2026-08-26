import { pipeline, env as transformersEnv } from '@xenova/transformers';
import { LocalModelInferenceResult } from '../types/api.js';

// Configure local cache directory and offline resilience
transformersEnv.allowLocalModels = true;
transformersEnv.useBrowserCache = false;

const MODEL_NAME = 'Xenova/distilbert-base-uncased-mnli';
const CANDIDATE_LABELS = ['real news', 'fake news', 'misleading or unverified news'];

export class LocalModelClassifierService {
  private classifierPipeline: any = null;
  private isInitializing = false;
  private initPromise: Promise<any> | null = null;
  private loadError: string | null = null;

  /**
   * Initializes or returns the cached local zero-shot NLI transformer pipeline
   */
  public async getPipeline(): Promise<any> {
    if (this.classifierPipeline) {
      return this.classifierPipeline;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        console.log(`[LocalModel] Loading zero-shot NLI transformer pipeline for "${MODEL_NAME}"...`);
        this.classifierPipeline = await pipeline('zero-shot-classification', MODEL_NAME, {
          quantized: true,
        });
        this.loadError = null;
        console.log(`[LocalModel] Successfully loaded zero-shot NLI model: "${MODEL_NAME}" (Task: zero-shot-classification)`);
        return this.classifierPipeline;
      } catch (err: any) {
        this.loadError = err?.message || 'Failed to initialize transformer pipeline';
        console.error(`[LocalModel] Failed to load local model "${MODEL_NAME}":`, err);
        this.classifierPipeline = null;
        return null;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Classifies input text using the zero-shot NLI transformer model
   */
  public async classifyText(text: string): Promise<LocalModelInferenceResult> {
    const startTime = Date.now();
    const cleanText = (text || '').slice(0, 1000).trim();

    if (!cleanText) {
      return {
        modelName: MODEL_NAME,
        prediction: 'REAL',
        confidence: 0,
        fakeProbability: 0,
        realProbability: 0,
        isLocal: true,
        inferenceTimeMs: 0,
      };
    }

    try {
      const pipe = await this.getPipeline();
      if (!pipe) {
        console.warn(`[LocalModel] Transformer pipeline unavailable ("${this.loadError || 'uninitialized'}"), reporting model unavailable.`);
        return {
          modelName: MODEL_NAME,
          prediction: 'REAL',
          confidence: 0,
          fakeProbability: 0,
          realProbability: 0,
          isLocal: false,
          inferenceTimeMs: Date.now() - startTime,
        };
      }

      const output = await pipe(cleanText, CANDIDATE_LABELS);
      const labels: string[] = output.labels || [];
      const scores: number[] = output.scores || [];

      const fakeIdx = labels.findIndex((l) => l.toLowerCase().includes('fake'));
      const realIdx = labels.findIndex((l) => l.toLowerCase().includes('real'));
      const misleadingIdx = labels.findIndex((l) => l.toLowerCase().includes('misleading'));

      const fakeScore = fakeIdx !== -1 ? scores[fakeIdx] : 0;
      const realScore = realIdx !== -1 ? scores[realIdx] : 0;
      const misleadingScore = misleadingIdx !== -1 ? scores[misleadingIdx] : 0;

      const topLabel = labels[0] || 'real news';
      const topScore = scores[0] || 0.5;

      const isFake = topLabel.toLowerCase().includes('fake') || topLabel.toLowerCase().includes('misleading');
      const prediction: 'REAL' | 'FAKE' = isFake ? 'FAKE' : 'REAL';

      const combinedFakeProb = Math.min(1, fakeScore + misleadingScore * 0.7);
      const combinedRealProb = Math.min(1, realScore + (1 - combinedFakeProb - realScore));

      const inferenceTimeMs = Date.now() - startTime;
      console.log(`[LocalModel] Zero-shot inference complete in ${inferenceTimeMs}ms: ${prediction} (top label: "${topLabel}", confidence: ${(topScore * 100).toFixed(1)}%)`);

      return {
        modelName: MODEL_NAME,
        prediction,
        confidence: Math.round(topScore * 100),
        fakeProbability: Math.round(combinedFakeProb * 100) / 100,
        realProbability: Math.round(combinedRealProb * 100) / 100,
        isLocal: true,
        inferenceTimeMs,
      };
    } catch (err) {
      console.error(`[LocalModel] Inference execution failed for "${MODEL_NAME}":`, err);
      return {
        modelName: MODEL_NAME,
        prediction: 'REAL',
        confidence: 0,
        fakeProbability: 0,
        realProbability: 0,
        isLocal: false,
        inferenceTimeMs: Date.now() - startTime,
      };
    }
  }
}

export const localModelClassifierService = new LocalModelClassifierService();
export default localModelClassifierService;
