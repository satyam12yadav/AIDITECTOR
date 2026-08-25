import { RelationToClaim, EvidenceRelation } from '../types/api.js';
import { entityExtractorService } from './entityExtractor.service.js';

export interface StanceEvaluationItem {
  relationToClaim: RelationToClaim;
  relation: EvidenceRelation; // backward compatibility
  stanceScore: 1 | 0 | -1;
  relevanceScore: number; // 0.0 - 1.0
  explanation: string;
}

export class StanceEvaluatorService {
  /**
   * Evaluates the semantic stance relation between a factual claim and an evidence excerpt.
   * Leverages Gemini AI when GEMINI_API_KEY is available, with fine-grained entity & location fallback.
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
        console.warn('[StanceEvaluator] Gemini stance evaluation failed, using semantic fallback:', err);
      }
    }

    // Fallback deterministic entity-aware stance evaluation
    return this.evaluateDeterministic(claimText, evidenceSnippet, evidenceTitle);
  }

  /**
   * Calls Google Gemini REST API for entity & semantic stance evaluation
   */
  private async evaluateWithGemini(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    publisher: string,
    apiKey: string
  ): Promise<StanceEvaluationItem | null> {
    const prompt = `You are a forensic fact-checking stance classifier.
Compare the FACTUAL CLAIM with the retrieved EVIDENCE item from "${publisher}".

CLAIM: "${claimText}"
EVIDENCE TITLE: "${evidenceTitle}"
EVIDENCE TEXT: "${evidenceSnippet}"

Evaluate the semantic meaning, entities (people, organizations, locations, dates, numbers, events), negations, and geographic hierarchy.

Examples:
- Claim: "Ram Mandir is in Delhi." vs Evidence: "Shri Ram Janmbhoomi Mandir is located in Ayodhya, Uttar Pradesh." -> CONTRADICTS (Ayodhya is not in Delhi).
- Claim: "Ram Mandir is in India." vs Evidence: "Shri Ram Janmbhoomi Mandir is located in Ayodhya, Uttar Pradesh." -> SUPPORTS (Ayodhya, UP is in India).

Classification criteria:
- "SUPPORTS": Evidence provides direct factual backing confirming the core claim and its entities.
- "CONTRADICTS": Evidence directly disproves, conflicts with, or provides mutually exclusive facts/locations/dates/numbers.
- "NEUTRAL": Evidence provides related background context without confirming or refuting the specific assertion.
- "INSUFFICIENT": Evidence is too brief, vague, or tangential to evaluate.

Return STRICT JSON only:
{
  "relationToClaim": "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "INSUFFICIENT",
  "relevanceScore": 0.0 to 1.0,
  "explanation": "A concise 1-2 sentence evidence-grounded explanation"
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
      const rel = (parsed.relationToClaim || '').toUpperCase() as RelationToClaim;

      if (['SUPPORTS', 'CONTRADICTS', 'NEUTRAL', 'INSUFFICIENT'].includes(rel)) {
        const stanceScore = rel === 'SUPPORTS' ? 1 : rel === 'CONTRADICTS' ? -1 : 0;
        const legacyRelation: EvidenceRelation = rel === 'SUPPORTS' ? 'supports' : rel === 'CONTRADICTS' ? 'contradicts' : 'unclear';
        const relevance = typeof parsed.relevanceScore === 'number' ? Math.max(0.1, Math.min(1.0, parsed.relevanceScore)) : 0.85;

        return {
          relationToClaim: rel,
          relation: legacyRelation,
          stanceScore,
          relevanceScore: relevance,
          explanation: parsed.explanation || `Evidence ${rel.toLowerCase()} the claim.`,
        };
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Deterministic entity-aware fallback
   */
  public evaluateDeterministic(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string
  ): StanceEvaluationItem {
    const combined = `${evidenceTitle} ${evidenceSnippet}`.toLowerCase();
    const claimLower = claimText.toLowerCase();

    const claimEntities = entityExtractorService.extractEntities(claimText);
    const evidenceEntities = entityExtractorService.extractEntities(`${evidenceTitle} ${evidenceSnippet}`);

    // 1. Explicit debunk & fact-check contradiction markers
    const contradictMarkers = [
      /\b(fake news|debunked|false claim|misleading|hoax|untrue|fabricated|fact check: false|no evidence|incorrectly claimed|falsely claimed|did not happen)\b/i,
    ];

    for (const pat of contradictMarkers) {
      if (pat.test(combined)) {
        return {
          relationToClaim: 'CONTRADICTS',
          relation: 'contradicts',
          stanceScore: -1,
          relevanceScore: 0.95,
          explanation: 'Evidence contains explicit debunking and fact-check contradiction markers.',
        };
      }
    }

    // 2. Location Compatibility Check (e.g. Ram Mandir in Delhi vs Ayodhya)
    if (claimEntities.locations.length > 0 && evidenceEntities.locations.length > 0) {
      for (const cLoc of claimEntities.locations) {
        for (const eLoc of evidenceEntities.locations) {
          const compat = entityExtractorService.checkLocationCompatibility(cLoc, eLoc);
          if (compat === 'CONTRADICTORY') {
            return {
              relationToClaim: 'CONTRADICTS',
              relation: 'contradicts',
              stanceScore: -1,
              relevanceScore: 0.90,
              explanation: `Location conflict: Claim states '${cLoc}', whereas evidence documents '${eLoc}'.`,
            };
          }
          if (compat === 'SUPPORTIVE' && combined.includes('mandir') || combined.includes('located') || combined.includes('temple')) {
            return {
              relationToClaim: 'SUPPORTS',
              relation: 'supports',
              stanceScore: 1,
              relevanceScore: 0.90,
              explanation: `Geographic corroboration: Evidence confirms location in '${eLoc}', which is consistent with '${cLoc}'.`,
            };
          }
        }
      }
    }

    // 3. Numerical / Date Match
    const numbersInClaim = claimEntities.numbers;
    let matchingNumbers = 0;
    for (const num of numbersInClaim) {
      if (num.length >= 1 && combined.includes(num.toLowerCase())) {
        matchingNumbers++;
      }
    }

    if (numbersInClaim.length > 0 && matchingNumbers >= 1) {
      return {
        relationToClaim: 'SUPPORTS',
        relation: 'supports',
        stanceScore: 1,
        relevanceScore: 0.92,
        explanation: `Numerical facts (${numbersInClaim.join(', ')}) directly match the retrieved evidence.`,
      };
    }

    // 4. Positive Support Verbs & Phrases
    const supportMarkers = [
      /\b(confirmed that|announced that|official data shows|released data|reports that|stated that|growth of|rose by|increased by|located in|situated in)\b/i,
    ];

    for (const pat of supportMarkers) {
      if (pat.test(combined)) {
        return {
          relationToClaim: 'SUPPORTS',
          relation: 'supports',
          stanceScore: 1,
          relevanceScore: 0.85,
          explanation: 'Evidence contains corroborating reporting from an authoritative source.',
        };
      }
    }

    // 5. Semantic Keyword Overlap
    const keywords = claimLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['that', 'this', 'with', 'from', 'have', 'were'].includes(w));

    let overlap = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) overlap++;
    }

    if (keywords.length > 0 && overlap / keywords.length >= 0.6) {
      return {
        relationToClaim: 'SUPPORTS',
        relation: 'supports',
        stanceScore: 1,
        relevanceScore: 0.80,
        explanation: 'Strong semantic keyword overlap corroborating the core statement.',
      };
    }

    if (evidenceSnippet.length < 30) {
      return {
        relationToClaim: 'INSUFFICIENT',
        relation: 'unclear',
        stanceScore: 0,
        relevanceScore: 0.30,
        explanation: 'Retrieved text excerpt is too concise to establish factual verification.',
      };
    }

    return {
      relationToClaim: 'NEUTRAL',
      relation: 'unclear',
      stanceScore: 0,
      relevanceScore: 0.50,
      explanation: 'Evidence provides related background context without definitive confirmation or refutation.',
    };
  }
}

export const stanceEvaluatorService = new StanceEvaluatorService();
export default stanceEvaluatorService;
