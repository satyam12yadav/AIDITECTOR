import { EvidenceRelation } from '../types/api.js';

export interface StanceEvaluationItem {
  relation: EvidenceRelation;
  stanceScore: 1 | 0 | -1;
  reasoning: string;
}

export class StanceEvaluatorService {
  /**
   * Evaluates the semantic stance relation between a factual claim and an evidence excerpt.
   * Leverages Gemini AI when GEMINI_API_KEY is available, with deterministic semantic fallback.
   */
  public async evaluateStance(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    publisher: string
  ): Promise<StanceEvaluationItem> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('placeholder')) {
      try {
        const aiResult = await this.evaluateWithGemini(claimText, evidenceSnippet, evidenceTitle, publisher, apiKey);
        if (aiResult) {
          return aiResult;
        }
      } catch (err) {
        console.warn('[StanceEvaluator] Gemini stance evaluation failed, using fallback:', err);
      }
    }

    // Fallback deterministic stance evaluation
    return this.evaluateDeterministic(claimText, evidenceSnippet, evidenceTitle);
  }

  /**
   * Calls Google Gemini REST API to determine semantic stance relation
   */
  private async evaluateWithGemini(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    publisher: string,
    apiKey: string
  ): Promise<StanceEvaluationItem | null> {
    const prompt = `You are a forensic fact-checking stance classifier.
Determine if the retrieved EVIDENCE excerpt SUPPORTS (+1), CONTRADICTS (-1), or is UNCLEAR/NEUTRAL (0) regarding the given FACTUAL CLAIM.

CLAIM: "${claimText}"
EVIDENCE SOURCE: ${publisher} - "${evidenceTitle}"
EVIDENCE TEXT: "${evidenceSnippet}"

Rules:
1. "supports" (+1): The evidence confirms, verifies, or provides direct factual backing for the claim (including matching figures, dates, official announcements).
2. "contradicts" (-1): The evidence explicitly debunks, refutes, disputes, or disproves the claim.
3. "unclear" (0): The evidence merely mentions related context without confirming or refuting the specific assertion.

Return STRICT JSON only:
{
  "relation": "supports" | "contradicts" | "unclear",
  "stanceScore": 1 | -1 | 0,
  "reasoning": "A concise 1-sentence explanation"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeout);
      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text.trim());
      if (parsed.relation && ['supports', 'contradicts', 'unclear'].includes(parsed.relation)) {
        const score = parsed.relation === 'supports' ? 1 : parsed.relation === 'contradicts' ? -1 : 0;
        return {
          relation: parsed.relation as EvidenceRelation,
          stanceScore: score as 1 | 0 | -1,
          reasoning: parsed.reasoning || `Evidence ${parsed.relation} the claim.`,
        };
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Deterministic semantic heuristic fallback
   */
  public evaluateDeterministic(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string
  ): StanceEvaluationItem {
    const combined = `${evidenceTitle} ${evidenceSnippet}`.toLowerCase();
    const claimLower = claimText.toLowerCase();

    // 1. Contradiction & Debunk Markers
    const contradictMarkers = [
      /\b(fake news|debunked|false claim|misleading|hoax|untrue|fabricated|fact check: false|no evidence)\b/i,
      /\b(incorrectly claimed|falsely claimed|did not happen|denied reports)\b/i,
    ];

    for (const pat of contradictMarkers) {
      if (pat.test(combined)) {
        return {
          relation: 'contradicts',
          stanceScore: -1,
          reasoning: 'Evidence contains explicit debunking or contradiction markers.',
        };
      }
    }

    // 2. Numerical / Date Match
    const numbersInClaim = claimText.match(/(\d+(\.\d+)?%|\$\d+|\b\d+\b)/g) || [];
    let matchingNumbers = 0;
    for (const num of numbersInClaim) {
      if (num.length > 1 && combined.includes(num.toLowerCase())) {
        matchingNumbers++;
      }
    }

    if (numbersInClaim.length > 0 && matchingNumbers >= 1) {
      return {
        relation: 'supports',
        stanceScore: 1,
        reasoning: `Numerical assertions (${numbersInClaim.join(', ')}) directly match the retrieved evidence.`,
      };
    }

    // 3. Positive Support Phrases
    const supportMarkers = [
      /\b(confirmed that|announced that|official data shows|released data|reports that|stated that|growth of|rose by|increased by)\b/i,
      /\b(according to official|published report|survey found|statistics show)\b/i,
    ];

    for (const pat of supportMarkers) {
      if (pat.test(combined)) {
        return {
          relation: 'supports',
          stanceScore: 1,
          reasoning: 'Evidence contains corroborating reporting from an official or media source.',
        };
      }
    }

    // 4. Keyword Overlap
    const keywords = claimLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['that', 'this', 'with', 'from', 'have', 'were'].includes(w));

    let overlap = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) overlap++;
    }

    if (keywords.length > 0 && overlap / keywords.length >= 0.5) {
      return {
        relation: 'supports',
        stanceScore: 1,
        reasoning: 'Strong semantic keyword overlap corroborating the core statement.',
      };
    }

    return {
      relation: 'unclear',
      stanceScore: 0,
      reasoning: 'Evidence provides related background context without definitive confirmation.',
    };
  }
}

export const stanceEvaluatorService = new StanceEvaluatorService();
export default stanceEvaluatorService;
