export class EmbeddingService {
  private readonly dimension: number = 256;

  // Domain semantic concept anchors
  private readonly semanticKeywords: string[] = [
    'fake', 'scam', 'hoax', 'fabricated', 'debunked', 'conspiracy', 'miracle', 'cure',
    'secret', 'alien', 'ufo', 'antigravity', 'free energy', 'chemtrails', 'flat earth',
    'government', 'official', 'reuters', 'bcci', 'icc', 'nasa', 'isro', 'election',
    'announcement', 'press release', 'court', 'supreme court', 'police', 'verified',
    'captain', 'cricket', 'world cup', 'tournament', 'champion', 'trophy', 'match',
    'president', 'prime minister', 'minister', 'parliament', 'assembly', 'treaty',
    'science', 'space', 'planet', 'geodesy', 'satellite', 'orbit', 'solar system',
    'health', 'vaccine', 'virus', 'doctor', 'hospital', 'medicine', 'fda', 'who',
    'money', 'currency', 'bank', 'rbi', 'economy', 'budget', 'gdp', 'inflation',
    'bollywood', 'actor', 'movie', 'married', 'wedding', 'divorce', 'bachelor',
    'floating', 'magnet', 'superconductor', 'quantum', 'locking', 'tr3b', 'radiation',
    'garlic', 'alkaline', 'lemon', 'baking', 'soda', '5g', 'nano', 'gps'
  ];

  /**
   * Generates a normalized semantic embedding vector (L2 norm = 1.0) for a given text
   */
  public async embedText(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(this.dimension).fill(0);
    }

    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter((w) => w.length > 1);

    const vector = new Array(this.dimension).fill(0);

    // 1. Semantic keyword anchor projections (first 64 dimensions)
    for (let i = 0; i < Math.min(64, this.semanticKeywords.length); i++) {
      const keyword = this.semanticKeywords[i];
      if (clean.includes(keyword)) {
        vector[i] += 4.0;
      }
    }

    // 2. Word feature hashing (dimensions 64 - 159)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordHash = Math.abs(this.hashCode(word)) % 96;
      vector[64 + wordHash] += 1.5;

      // Bi-grams
      if (i < words.length - 1) {
        const bigram = `${word}_${words[i + 1]}`;
        const bigramHash = Math.abs(this.hashCode(bigram)) % 96;
        vector[64 + bigramHash] += 2.0;
      }
    }

    // 3. Subword 3-gram feature hashing (dimensions 160 - 255)
    for (const word of words) {
      if (word.length >= 3) {
        for (let j = 0; j <= word.length - 3; j++) {
          const trigram = word.slice(j, j + 3);
          const trigramHash = Math.abs(this.hashCode(trigram)) % 96;
          vector[160 + trigramHash] += 0.8;
        }
      }
    }

    // 4. Negation & Polarity boost
    const negationCount = (clean.match(/\b(not|never|no|false|fake|debunked|cannot|no longer|unmarried)\b/g) || []).length;
    if (negationCount > 0) {
      vector[0] += negationCount * 2.0;
      vector[1] += negationCount * 2.0;
    }

    // 5. L2 Normalization
    return this.normalizeVector(vector);
  }

  /**
   * Generates embeddings in batch
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embedText(text));
    }
    return results;
  }

  /**
   * Computes cosine similarity between two unit vectors (range: -1.0 to 1.0)
   */
  public cosineSimilarity(v1: number[], v2: number[]): number {
    if (!v1 || !v2 || v1.length !== v2.length) return 0;

    let dot = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
    }

    const clamped = Math.max(-1.0, Math.min(1.0, dot));
    return Math.round(clamped * 10000) / 10000;
  }

  /**
   * Performs L2 Normalization on a vector
   */
  private normalizeVector(v: number[]): number[] {
    let sumSq = 0;
    for (const val of v) {
      sumSq += val * val;
    }

    const norm = Math.sqrt(sumSq);
    if (norm === 0) {
      return v;
    }

    return v.map((val) => Math.round((val / norm) * 10000) / 10000);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
