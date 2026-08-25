export interface GoogleFactCheckItem {
  text: string;
  claimant?: string;
  claimDate?: string;
  claimReview: Array<{
    publisher: {
      name: string;
      site: string;
    };
    url: string;
    title: string;
    reviewDate?: string;
    textualRating: string;
  }>;
}

export interface FactCheckSearchResult {
  title: string;
  url: string;
  publisher: string;
  rating: string;
  snippet: string;
  publishedDate: string | null;
}

export class GoogleFactCheckService {
  /**
   * Queries Google Fact Check Tools API for verified ClaimReview records
   */
  public async searchFactChecks(query: string): Promise<FactCheckSearchResult[]> {
    const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('placeholder')) {
      return [];
    }

    const encoded = encodeURIComponent(query);
    const endpoint = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encoded}&key=${apiKey}&languageCode=en`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const claims = (data?.claims || []) as GoogleFactCheckItem[];

      const results: FactCheckSearchResult[] = [];

      for (const item of claims.slice(0, 3)) {
        if (item.claimReview && item.claimReview.length > 0) {
          const review = item.claimReview[0];
          results.push({
            title: review.title || item.text,
            url: review.url,
            publisher: review.publisher?.name || 'IFCN Fact-Checker',
            rating: review.textualRating || 'Fact-Check Review',
            snippet: `[Fact Check Rating: ${review.textualRating || 'Reviewed'}] Claim: "${item.text}". Review: ${review.title || 'Independent verification by ' + (review.publisher?.name || 'Fact-Checker')}.`,
            publishedDate: review.reviewDate || item.claimDate || null,
          });
        }
      }

      return results;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }
}

export const googleFactCheckService = new GoogleFactCheckService();
export default googleFactCheckService;
