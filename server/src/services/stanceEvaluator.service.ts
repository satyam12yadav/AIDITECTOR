import { RelationToClaim, EvidenceRelation, EvidenceRelevance } from '../types/api.js';
import { entityExtractorService } from './entityExtractor.service.js';

export interface StanceEvaluationItem {
  relation: EvidenceRelation; // "supports" | "contradicts" | "unclear"
  relationToClaim: RelationToClaim; // "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "INSUFFICIENT"
  relevance: EvidenceRelevance; // "direct" | "related" | "irrelevant"
  confidence: number; // 0 - 100
  reasoning: string;
  keyEvidence: string;
  stanceScore: 1 | 0 | -1;
  relevanceScore: number; // 0.0 - 1.0
  explanation: string;
}

export class StanceEvaluatorService {
  /**
   * Evaluates the exact claim-level evidence verification.
   * Compares the EXACT CLAIM against the retrieved evidence snippet.
   */
  public async evaluateStance(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    publisher: string,
    isTimeSensitive = false
  ): Promise<StanceEvaluationItem> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('placeholder')) {
      try {
        const aiResult = await this.evaluateWithGemini(
          claimText,
          evidenceSnippet,
          evidenceTitle,
          publisher,
          isTimeSensitive,
          apiKey
        );
        if (aiResult) {
          return aiResult;
        }
      } catch (err) {
        console.warn('[StanceEvaluator] Gemini stance evaluation failed, using deterministic engine:', err);
      }
    }

    // Fallback deterministic claim-level verification
    return this.evaluateDeterministic(claimText, evidenceSnippet, evidenceTitle, isTimeSensitive);
  }

  /**
   * Calls Google Gemini REST API for exact claim-level verification
   */
  private async evaluateWithGemini(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    publisher: string,
    isTimeSensitive: boolean,
    apiKey: string
  ): Promise<StanceEvaluationItem | null> {
    const prompt = `You are a strict, forensic claim-level fact-checker.

Compare the EXACT CLAIM with the retrieved EVIDENCE item from "${publisher}".

EXACT CLAIM: "${claimText}"
${isTimeSensitive ? 'NOTE: This claim is TIME-SENSITIVE regarding current status, office, or governance.' : ''}

EVIDENCE TITLE: "${evidenceTitle}"
EVIDENCE TEXT: "${evidenceSnippet}"

STRICT CLAIM-VERIFICATION RULES:
1. "relevance":
   - "direct": The evidence explicitly discusses and directly answers the specific assertion in the claim.
   - "related": The evidence mentions the entity or general topic (e.g. mentions "BJP" or "India"), but DOES NOT verify or answer the specific assertion (e.g. doesn't state who currently rules or holds power).
   - "irrelevant": The evidence is off-topic or coincidental.

2. "relation":
   - "supports": ONLY if relevance is "direct" AND the evidence actually proves the claim true. DO NOT classify as "supports" merely because it shares keywords or mentions the same entity.
   - "contradicts": ONLY if relevance is "direct" AND the evidence directly disproves or conflicts with the claim.
   - "unclear": If relevance is "related", "irrelevant", or evidence is insufficient to verify the claim.

3. "keyEvidence": Extract the exact verbatim fact/phrase from the evidence that answers the claim (or empty string if none).

Return STRICT JSON only:
{
  "relation": "supports" | "contradicts" | "unclear",
  "relevance": "direct" | "related" | "irrelevant",
  "confidence": 0-100,
  "reasoning": "A concise 1-2 sentence explanation of why this evidence directly supports, contradicts, or is merely related.",
  "keyEvidence": "Exact key sentence or fact from the snippet"
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
      const rel = (parsed.relation || 'unclear').toLowerCase() as EvidenceRelation;
      const relevance = (parsed.relevance || 'related').toLowerCase() as EvidenceRelevance;
      const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : 75;

      const relationToClaim: RelationToClaim =
        rel === 'supports' && relevance === 'direct'
          ? 'SUPPORTS'
          : rel === 'contradicts' && relevance === 'direct'
          ? 'CONTRADICTS'
          : relevance === 'irrelevant'
          ? 'INSUFFICIENT'
          : 'NEUTRAL';

      const stanceScore: 1 | 0 | -1 = relationToClaim === 'SUPPORTS' ? 1 : relationToClaim === 'CONTRADICTS' ? -1 : 0;
      const relevanceScore = relevance === 'direct' ? 1.0 : relevance === 'related' ? 0.2 : 0.0;

      return {
        relation: rel,
        relationToClaim,
        relevance,
        confidence,
        reasoning: parsed.reasoning || `Evidence evaluated as ${rel} with ${relevance} relevance.`,
        keyEvidence: parsed.keyEvidence || '',
        stanceScore,
        relevanceScore,
        explanation: parsed.reasoning || `Evidence ${rel} the claim.`,
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Deterministic exact claim-level verification fallback
   */
  public evaluateDeterministic(
    claimText: string,
    evidenceSnippet: string,
    evidenceTitle: string,
    isTimeSensitive = false
  ): StanceEvaluationItem {
    const combined = `${evidenceTitle} ${evidenceSnippet}`.toLowerCase();
    const claimLower = claimText.toLowerCase();

    const claimEntities = entityExtractorService.extractEntities(claimText);
    const evidenceEntities = entityExtractorService.extractEntities(`${evidenceTitle} ${evidenceSnippet}`);

    // 1. Explicit debunk & fact-check contradiction markers (Strict: Must explicitly target the factual claim)
    const contradictMarkers = [
      /\b(fact[- ]check:\s*(false|fake|misleading|untrue)|claim\s+(is|was)\s+(false|fake|fabricated|debunked|untrue)|no evidence\s+(to suggest|that)|debunked:\s*|falsely claimed that|hoax claim)\b/i,
    ];

    for (const pat of contradictMarkers) {
      if (pat.test(combined)) {
        return {
          relation: 'contradicts',
          relationToClaim: 'CONTRADICTS',
          relevance: 'direct',
          confidence: 95,
          reasoning: 'Evidence contains explicit debunking and fact-check contradiction markers.',
          keyEvidence: evidenceSnippet.slice(0, 120),
          stanceScore: -1,
          relevanceScore: 1.0,
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
              relation: 'contradicts',
              relationToClaim: 'CONTRADICTS',
              relevance: 'direct',
              confidence: 90,
              reasoning: `Location conflict: Claim states '${cLoc}', whereas evidence documents '${eLoc}'.`,
              keyEvidence: `Located in ${eLoc}`,
              stanceScore: -1,
              relevanceScore: 1.0,
              explanation: `Location conflict: Claim states '${cLoc}', whereas evidence documents '${eLoc}'.`,
            };
          }
          if (compat === 'SUPPORTIVE') {
            return {
              relation: 'supports',
              relationToClaim: 'SUPPORTS',
              relevance: 'direct',
              confidence: 95,
              reasoning: `Geographic corroboration: Evidence confirms location in '${eLoc}', which is consistent with '${cLoc}'.`,
              keyEvidence: `Located in ${eLoc}`,
              stanceScore: 1,
              relevanceScore: 1.0,
              explanation: `Geographic corroboration: Evidence confirms location in '${eLoc}', which is consistent with '${cLoc}'.`,
            };
          }
        }
      }
    }

    // 3. Time-Sensitive Ruling Party / Political Status Check
    // e.g. "BJP is ruler party of India" / "BJP is in power"
    const isRulingPartyClaim =
      /\b(ruler party|ruling party|in power|runs the government|union government|forms government|prime minister|narendra modi)\b/i.test(claimLower) &&
      /\b(bjp|bharatiya janata party|nda)\b/i.test(claimLower);

    if (isRulingPartyClaim) {
      const directGovtMarkers = [
        /\b(bjp-led|nda government|ruling bjp|ruling party|modi government|union government|centre|central government|in power|retained power|won the 2024 election|prime minister narendra modi)\b/i,
      ];

      const matchesDirectGov = directGovtMarkers.some((pat) => pat.test(combined));
      if (matchesDirectGov) {
        return {
          relation: 'supports',
          relationToClaim: 'SUPPORTS',
          relevance: 'direct',
          confidence: 92,
          reasoning: 'Authoritative reporting confirms the BJP-led NDA as the current ruling coalition in the Union Government.',
          keyEvidence: evidenceSnippet.slice(0, 120),
          stanceScore: 1,
          relevanceScore: 1.0,
          explanation: 'Authoritative reporting confirms the BJP-led NDA as the current ruling coalition in the Union Government.',
        };
      } else {
        // Just mentions BJP in an unrelated context (e.g. an internal skit or state donation row)
        return {
          relation: 'unclear',
          relationToClaim: 'NEUTRAL',
          relevance: 'related',
          confidence: 60,
          reasoning: 'Evidence mentions the party or entity, but does not provide direct verification of national ruling party status.',
          keyEvidence: '',
          stanceScore: 0,
          relevanceScore: 0.2,
          explanation: 'Evidence mentions the party or entity, but does not provide direct verification of national ruling party status.',
        };
      }
    }

    // 4. Numerical / Date Exact Match
    const numbersInClaim = claimEntities.numbers;
    let matchingNumbers = 0;
    for (const num of numbersInClaim) {
      if (num.length >= 1 && combined.includes(num.toLowerCase())) {
        matchingNumbers++;
      }
    }

    if (numbersInClaim.length > 0 && matchingNumbers >= 1) {
      return {
        relation: 'supports',
        relationToClaim: 'SUPPORTS',
        relevance: 'direct',
        confidence: 88,
        reasoning: `Numerical facts (${numbersInClaim.join(', ')}) directly match the retrieved evidence.`,
        keyEvidence: numbersInClaim.join(', '),
        stanceScore: 1,
        relevanceScore: 1.0,
        explanation: `Numerical facts (${numbersInClaim.join(', ')}) directly match the retrieved evidence.`,
      };
    }

    // 5. Positive Support Verbs & Predicates
    const supportMarkers = [
      /\b(confirmed that|announced that|official data shows|released data|reports that|stated that|growth of|rose by|increased by|located in|situated in)\b/i,
    ];

    for (const pat of supportMarkers) {
      if (pat.test(combined)) {
        return {
          relation: 'supports',
          relationToClaim: 'SUPPORTS',
          relevance: 'direct',
          confidence: 85,
          reasoning: 'Evidence contains corroborating reporting from an authoritative source.',
          keyEvidence: evidenceSnippet.slice(0, 120),
          stanceScore: 1,
          relevanceScore: 1.0,
          explanation: 'Evidence contains corroborating reporting from an authoritative source.',
        };
      }
    }

    // 6. Semantic Keyword Overlap (Strict: Must overlap >= 75% of non-stopwords)
    const keywords = claimLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['that', 'this', 'with', 'from', 'have', 'were', 'about'].includes(w));

    let overlap = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) overlap++;
    }

    if (keywords.length > 0 && overlap / keywords.length >= 0.75) {
      return {
        relation: 'supports',
        relationToClaim: 'SUPPORTS',
        relevance: 'direct',
        confidence: 80,
        reasoning: 'Strong semantic correlation corroborating the core statement.',
        keyEvidence: evidenceSnippet.slice(0, 120),
        stanceScore: 1,
        relevanceScore: 1.0,
        explanation: 'Strong semantic correlation corroborating the core statement.',
      };
    }

    if (keywords.length > 0 && overlap / keywords.length >= 0.3) {
      return {
        relation: 'unclear',
        relationToClaim: 'NEUTRAL',
        relevance: 'related',
        confidence: 50,
        reasoning: 'Evidence mentions the subject or entity, but does not verify the specific claim assertion.',
        keyEvidence: '',
        stanceScore: 0,
        relevanceScore: 0.2,
        explanation: 'Evidence mentions the subject or entity, but does not verify the specific claim assertion.',
      };
    }

    return {
      relation: 'unclear',
      relationToClaim: 'INSUFFICIENT',
      relevance: 'irrelevant',
      confidence: 30,
      reasoning: 'Retrieved text does not address this specific factual assertion.',
      keyEvidence: '',
      stanceScore: 0,
      relevanceScore: 0.0,
      explanation: 'Retrieved text does not address this specific factual assertion.',
    };
  }
}

export const stanceEvaluatorService = new StanceEvaluatorService();
export default stanceEvaluatorService;
