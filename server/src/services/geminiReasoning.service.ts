import {
  ExtractedClaim,
  RetrievedEvidenceItem,
  ArticleMetadata,
  ClaimForensicEvaluation,
  ClaimVerdictType,
} from '../types/api.js';

export class GeminiReasoningService {
  /**
   * Performs evidence-grounded forensic reasoning over retrieved citations and claim context
   */
  public async evaluateClaimReasoning(
    claim: ExtractedClaim,
    article: ArticleMetadata,
    evidenceForClaim: RetrievedEvidenceItem[]
  ): Promise<ClaimForensicEvaluation> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Filter evidence into direct support, direct contradictions, and related context
    const directSupporting = evidenceForClaim.filter(
      (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
    );
    const directContradicting = evidenceForClaim.filter(
      (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
    );
    const relatedContext = evidenceForClaim.filter((e) => e.relevance === 'related');

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('placeholder')) {
      try {
        const aiEvaluation = await this.evaluateWithGemini(
          claim,
          article,
          evidenceForClaim,
          directSupporting,
          directContradicting,
          relatedContext,
          apiKey
        );
        if (aiEvaluation) {
          return aiEvaluation;
        }
      } catch (err) {
        console.warn(`[GeminiReasoning] AI reasoning failed for claim ${claim.id}, using deterministic engine:`, err);
      }
    }

    // Fallback deterministic evidence reasoning
    return this.evaluateDeterministic(claim, evidenceForClaim, directSupporting, directContradicting, relatedContext);
  }

  /**
   * Calls Gemini AI to reason strictly over the provided evidence citations
   */
  private async evaluateWithGemini(
    claim: ExtractedClaim,
    article: ArticleMetadata,
    allEvidence: RetrievedEvidenceItem[],
    directSupporting: RetrievedEvidenceItem[],
    directContradicting: RetrievedEvidenceItem[],
    relatedContext: RetrievedEvidenceItem[],
    apiKey: string
  ): Promise<ClaimForensicEvaluation | null> {
    const prompt = `You are the Lead Forensic Fact-Checker for an evidence-based claim verification engine.

Your task is to evaluate whether the following FACTUAL CLAIM is TRUE, FALSE, MISLEADING, UNVERIFIED, or UNKNOWN.

CRITICAL INSTRUCTIONS:
1. Reason STRICTLY over the provided retrieved evidence and relevance classifications below.
2. DO NOT decide whether the claim is true based only on your pre-trained memory.
3. NEVER invent evidence, citations, quotations, or URLs.
4. If no DIRECT evidence confirms the claim (only "related" or no evidence exists), return "UNVERIFIED" / "INSUFFICIENT EVIDENCE". DO NOT classify as TRUE!
5. Only DIRECT evidence can support a TRUE or FALSE verdict.

CLAIM TO EVALUATE:
"${claim.text}" (Importance: ${claim.importance}${claim.isTimeSensitive ? ', TIME-SENSITIVE' : ''})

INGESTED ARTICLE CONTEXT:
Title: "${article.title}"
Publisher: "${article.publisher || 'Direct Ingestion'}"

RETRIEVED EVIDENCE DOSSIER (${allEvidence.length} items):
${allEvidence.length === 0 ? 'No external evidence retrieved.' : allEvidence.map((e, idx) => `[Evidence ${idx + 1}]
Source: ${e.sourceName} (Tier ${e.sourceTier || 3}, Credibility: ${e.credibilityScore}/100)
URL: ${e.sourceUrl}
Date: ${e.publishedDate || 'Unspecified'}
Relevance: ${e.relevance?.toUpperCase() || 'DIRECT'}
Relation: ${e.relationToClaim}
Snippet: "${e.evidenceText || e.snippet}"
Key Fact: "${e.keyEvidence || 'None'}"
Explanation: "${e.explanation || 'No explanation provided'}"`).join('\n\n')}

DECISION RULES:
- "TRUE": Strong, reliable DIRECT evidence (Tier 1, 2, or 3) entails and proves the claim with no material contradictory evidence.
- "FALSE": Reliable DIRECT evidence directly contradicts or refutes the claim (including conflicting propositions such as differing capitals, locations, numbers, dates, winners, composition, or leadership transitions even if the text does not use literal words like "false" or "not").
- "MISLEADING": The claim contains partial truth or accurate entities but presents them incorrectly, out of context, or with misleading implications.
- "UNVERIFIED": There is insufficient or only "related" evidence to determine the truth. (Absence of direct evidence must NOT be marked TRUE or FALSE).
- "UNKNOWN": The claim is fundamentally unfalsifiable or cannot be reliably evaluated.

Return STRICT JSON only:
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIED" | "UNKNOWN",
  "confidence": 0 to 100,
  "reasoning": "A concise, objective 2-3 sentence explanation summarizing how the retrieved evidence justifies this verdict.",
  "keyEvidence": ["Title or excerpt of primary supporting citations"],
  "contradictingEvidence": ["Title or excerpt of refuting citations"],
  "limitations": ["Any limitations in evidence coverage, dates, or source depth"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

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
      const v = (parsed.verdict || '').toUpperCase() as ClaimVerdictType;

      if (['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED', 'UNKNOWN'].includes(v)) {
        const conf = typeof parsed.confidence === 'number' ? Math.max(10, Math.min(100, Math.round(parsed.confidence))) : 80;
        return {
          verdict: v,
          confidence: conf,
          reasoning: parsed.reasoning || `Claim evaluated as ${v} based on retrieved evidence.`,
          keyEvidence: Array.isArray(parsed.keyEvidence) ? parsed.keyEvidence : [],
          contradictingEvidence: Array.isArray(parsed.contradictingEvidence) ? parsed.contradictingEvidence : [],
          limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
        };
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Deterministic evidence-grounded fallback reasoning engine
   */
  public evaluateDeterministic(
    claim: ExtractedClaim,
    allEvidence: RetrievedEvidenceItem[],
    directSupporting: RetrievedEvidenceItem[],
    directContradicting: RetrievedEvidenceItem[],
    relatedContext: RetrievedEvidenceItem[]
  ): ClaimForensicEvaluation {
    if (allEvidence.length === 0) {
      return {
        verdict: 'UNVERIFIED',
        confidence: 35,
        reasoning: 'INSUFFICIENT EVIDENCE: Independent external evidence could not be located to verify or refute this assertion.',
        keyEvidence: [],
        contradictingEvidence: [],
        limitations: ['No independent external evidence records retrieved.'],
      };
    }

    if (directContradicting.length > 0) {
      const topContradict = directContradicting[0];
      return {
        verdict: 'FALSE',
        confidence: 90,
        reasoning: `Reliable external evidence from ${topContradict.sourceName} directly contradicts this assertion (${topContradict.explanation || 'Refuted by authoritative source'}).`,
        keyEvidence: [],
        contradictingEvidence: directContradicting.map((e) => `${e.sourceName}: ${e.title}`),
        limitations: [],
      };
    }

    if (directSupporting.length > 0) {
      const highTierSupport = directSupporting.some((e) => (e.sourceTier || 3) <= 2);
      const conf = highTierSupport ? 95 : 85;
      return {
        verdict: 'TRUE',
        confidence: conf,
        reasoning: `Claim is directly supported by authoritative reporting from ${directSupporting.map((e) => e.sourceName).slice(0, 2).join(' and ')}.`,
        keyEvidence: directSupporting.map((e) => `${e.sourceName}: ${e.title}`),
        contradictingEvidence: [],
        limitations: [],
      };
    }

    // Only related or unclear evidence was found
    if (relatedContext.length > 0 || allEvidence.length > 0) {
      return {
        verdict: 'UNVERIFIED',
        confidence: 45,
        reasoning: 'INSUFFICIENT EVIDENCE: Retrieved sources mention the topic or entity, but do not provide direct verification of the specific assertion.',
        keyEvidence: allEvidence.map((e) => `${e.sourceName}: ${e.title}`),
        contradictingEvidence: [],
        limitations: ['Evidence is contextual or related, lacking direct verification of the exact assertion.'],
      };
    }

    return {
      verdict: 'UNKNOWN',
      confidence: 30,
      reasoning: 'Available evidence is ambiguous or inconclusive.',
      keyEvidence: [],
      contradictingEvidence: [],
      limitations: ['Inconclusive evidence dossier.'],
    };
  }
}

export const geminiReasoningService = new GeminiReasoningService();
export default geminiReasoningService;
