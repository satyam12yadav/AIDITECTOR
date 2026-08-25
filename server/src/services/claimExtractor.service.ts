import { ExtractedClaim } from '../types/api.js';

export const CLAIM_EXTRACTION_SYSTEM_PROMPT = `You are the Claim Extraction Engine for an AI-powered misinformation verification system.

Your job is NOT to decide whether the article is true or false.

Your only job is to identify important factual claims that can be independently verified.

Given an article:

1. Extract only factual claims.
2. Ignore opinions.
3. Ignore predictions unless presented as facts.
4. Ignore rhetorical statements.
5. Break complex statements into independently verifiable claims.
6. Prioritize claims that materially affect the article's conclusion.
7. Do not invent claims.
8. Preserve the original meaning.

Return STRICT JSON only:

{
  "claims": [
    {
      "id": "claim-1",
      "text": "...",
      "importance": 0.0,
      "claim_type": "factual"
    }
  ]
}

importance must be between 0 and 1.

Return no markdown.
Return no explanation outside JSON.`;

const OPINION_MARKERS = [
  /\b(in my opinion|i believe|i think|in our view|we feel|arguably|personally|to my mind|it seems to me)\b/i,
  /\b(obviously|clearly|undoubtedly|surely|unquestionably)\b/i,
  /\b(wonderful|terrible|awesome|horrible|disgraceful|magnificent|beautiful|ugly|pleasant)\b/i,
  /\b(should be|ought to be|must surely be)\b/i,
];

const STATISTICAL_REGEX =
  /(\d+(\.\d+)?%|\$\d+|\b\d+\s*(billion|million|trillion|percent|cases|deaths|tons|km|miles|dollars|euros|pounds)\b|\b\d{4}\b|\b\d+(\.\d+)?\s*(fold|times|increase|decrease)\b)/i;

const ATTRIBUTED_REGEX =
  /\b(stated|announced|confirmed|reported|claimed|discovered|published|found that|demonstrated|according to|concluded)\b/i;

const HISTORICAL_REGEX = /\b(in (19\d{2}|20\d{2})|during the|historical|founded in|since (19\d{2}|20\d{2}))\b/i;

export class ClaimExtractorService {
  /**
   * Decomposes article text into verifiable atomic factual claims
   */
  public extractClaims(articleText: string): { claims: ExtractedClaim[] } {
    if (!articleText || articleText.trim().length === 0) {
      return { claims: [] };
    }

    const paragraphs = articleText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const extractedClaims: ExtractedClaim[] = [];
    let claimCounter = 1;

    for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
      const paragraph = paragraphs[pIndex];

      // Split paragraph into candidate sentences
      const rawSentences = this.splitIntoSentences(paragraph);

      for (const rawSentence of rawSentences) {
        const sentence = rawSentence.trim();

        // 1. Basic length filter (allow concise factual assertions >= 8 chars)
        if (sentence.length < 8) continue;

        // 2. Ignore purely subjective or opinion statements
        if (this.isOpinionOrRhetoric(sentence)) continue;

        // 3. Break compound statements into atomic assertions if distinct facts exist
        const atomicStatements = this.decomposeCompoundSentence(sentence);

        for (const statement of atomicStatements) {
          if (statement.length < 8) continue;

          const claimType = this.classifyClaimType(statement);
          const importance = this.calculateImportance(statement, pIndex, paragraphs.length);

          extractedClaims.push({
            id: `claim-${claimCounter++}`,
            text: this.normalizeClaimText(statement),
            importance,
            claim_type: claimType,
          });

          // Cap max claims to high-priority items
          if (extractedClaims.length >= 15) break;
        }

        if (extractedClaims.length >= 15) break;
      }

      if (extractedClaims.length >= 15) break;
    }

    // Sort by importance descending
    extractedClaims.sort((a, b) => b.importance - a.importance);

    return {
      claims: extractedClaims,
    };
  }

  /**
   * Splits paragraph into sentences preserving abbreviations
   */
  private splitIntoSentences(text: string): string[] {
    // Protect common abbreviations (Dr., Prof., U.S., e.g., i.e., Section 12-B)
    const protectedText = text
      .replace(/\b(Dr|Prof|Mr|Mrs|Ms|U\.S|e\.g|i\.e|Inc|Corp|Ltd|Sec|No)\./gi, '$1__DOT__')
      .replace(/(\d+)\.(\d+)/g, '$1__DECIMAL__$2');

    const sentences = protectedText.split(/(?<=[.!?])\s+/);

    return sentences.map((s) =>
      s
        .replace(/__DOT__/g, '.')
        .replace(/__DECIMAL__/g, '.')
        .trim()
    );
  }

  /**
   * Checks if sentence is predominantly opinion or rhetorical flourish
   */
  private isOpinionOrRhetoric(sentence: string): boolean {
    const hasOpinionMarker = OPINION_MARKERS.some((marker) => marker.test(sentence));
    const hasFactualMarker = STATISTICAL_REGEX.test(sentence) || ATTRIBUTED_REGEX.test(sentence);

    // If it has explicit opinion marker and no hard statistical data, treat as opinion
    if (hasOpinionMarker && !hasFactualMarker) {
      return true;
    }

    // Question marks are rhetorical
    if (sentence.endsWith('?')) {
      return true;
    }

    return false;
  }

  /**
   * Splits compound sentences joined by semicolons or contrastive clauses
   */
  private decomposeCompoundSentence(sentence: string): string[] {
    // Semicolon split
    if (sentence.includes(';')) {
      return sentence.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    return [sentence];
  }

  /**
   * Classifies the factual domain of the claim
   */
  private classifyClaimType(statement: string): 'factual' | 'statistical' | 'historical' | 'quote' {
    if (STATISTICAL_REGEX.test(statement)) {
      return 'statistical';
    }
    if (HISTORICAL_REGEX.test(statement)) {
      return 'historical';
    }
    if (statement.includes('"') || ATTRIBUTED_REGEX.test(statement)) {
      return 'quote';
    }
    return 'factual';
  }

  /**
   * Calculates an importance score between 0.10 and 1.00
   */
  private calculateImportance(statement: string, paragraphIndex: number, totalParagraphs: number): number {
    let score = 0.5;

    // Lead paragraph bonus (claims in intro are usually core thesis)
    if (paragraphIndex === 0) {
      score += 0.2;
    } else if (paragraphIndex === 1) {
      score += 0.1;
    }

    // Statistical precision bonus
    if (STATISTICAL_REGEX.test(statement)) {
      score += 0.2;
    }

    // Direct citation / attribution bonus
    if (ATTRIBUTED_REGEX.test(statement)) {
      score += 0.1;
    }

    // Penalize very short trailing statements
    if (paragraphIndex > totalParagraphs - 2 && statement.length < 40) {
      score -= 0.15;
    }

    // Clamp between 0.1 and 0.98 and round to 2 decimal places
    const clamped = Math.max(0.1, Math.min(0.98, score));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Normalizes claim text with punctuation and whitespace cleanup
   */
  private normalizeClaimText(text: string): string {
    let cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('"')) {
      cleaned += '.';
    }
    return cleaned;
  }
}

export const claimExtractorService = new ClaimExtractorService();
