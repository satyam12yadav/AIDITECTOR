import { ExtractedClaim, ClaimType } from '../types/api.js';

const OPINION_MARKERS = [
  /\b(in my opinion|i believe|i think|in our view|we feel|arguably|personally|to my mind|it seems to me)\b/i,
  /\b(obviously|clearly|undoubtedly|surely|unquestionably)\b/i,
  /\b(wonderful|terrible|awesome|horrible|disgraceful|magnificent|beautiful|ugly|pleasant)\b/i,
  /\b(should be|ought to be|must surely be)\b/i,
];

const ADVERTISEMENT_OR_BOILERPLATE = [
  /\b(subscribe now|click here|follow us on|read also|also read|advertisement|sponsored content|all rights reserved|terms of service|privacy policy|newsletter|sign up for)\b/i,
];

const STATISTICAL_REGEX =
  /(\d+(\.\d+)?%|\$\d+|₹\d+|\b\d+([,.]\d+)*\s*(crore|lakh|billion|million|trillion|percent|cases|deaths|tons|km|miles|dollars|euros|pounds|jobs|rupees|rs)\b|\b\d{1,3}(,\d{3})+\b)/i;

const GEOGRAPHIC_REGEX =
  /\b(located in|situated in|country in|capital of|continent of|island in|ocean|river|is in|are in|lies in|extends to|in delhi|in ayodhya|in india|in pakistan|in asia|in europe|in south america|in north america)\b/i;

const TEMPORAL_REGEX =
  /(\b(on monday|on tuesday|on wednesday|on thursday|on friday|on saturday|on sunday)\b|\bby (20\d{2}|19\d{2})\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/i;

const POLITICAL_REGEX =
  /\b(government|ministry|minister|prime minister|president|parliament|election|bjp|congress|nda|policy|bill|act|supreme court|high court)\b/i;

const SCIENTIFIC_REGEX =
  /\b(space|isro|nasa|climate|temperature|disease|vaccine|organism|species|ocean|orbit|atmosphere|quantum|physics|chemistry)\b/i;

const ATTRIBUTED_REGEX =
  /\b(stated|announced|confirmed|reported|claimed|discovered|published|found that|demonstrated|according to|concluded|officials said)\b/i;

const HISTORICAL_REGEX = /\b(in (19\d{2}|20\d{2})|during the|historical|founded in|since (19\d{2}|20\d{2}))\b/i;

export class ClaimExtractorService {
  /**
   * Decomposes article text into multiple verifiable atomic factual claims
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

        // 1. Basic length & boilerplate filter
        if (sentence.length < 10) continue;
        if (this.isAdvertisementOrBoilerplate(sentence)) continue;

        // 2. Ignore purely subjective or opinion statements
        if (this.isOpinionOrRhetoric(sentence)) continue;

        // 3. Break compound statements into atomic assertions if distinct facts exist
        const atomicStatements = this.decomposeCompoundSentence(sentence);

        for (const statement of atomicStatements) {
          const cleanStmt = statement.trim();
          if (cleanStmt.length < 10) continue;
          if (this.isOpinionOrRhetoric(cleanStmt)) continue;

          const claimType = this.classifyClaimType(cleanStmt);
          const importance = this.calculateImportance(cleanStmt, pIndex, paragraphs.length);

          extractedClaims.push({
            id: `claim-${claimCounter++}`,
            text: this.normalizeClaimText(cleanStmt),
            importance,
            claim_type: claimType,
            claimType: claimType,
          });

          // Cap max claims per article to top 6
          if (extractedClaims.length >= 6) break;
        }

        if (extractedClaims.length >= 6) break;
      }

      if (extractedClaims.length >= 6) break;
    }

    // Sort by importance descending so core claims are analyzed first
    extractedClaims.sort((a, b) => b.importance - a.importance);

    return {
      claims: extractedClaims,
    };
  }

  /**
   * Splits paragraph into sentences preserving abbreviations and numbers
   */
  private splitIntoSentences(text: string): string[] {
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
   * Checks if sentence contains advertising, social sharing, or web boilerplate
   */
  private isAdvertisementOrBoilerplate(sentence: string): boolean {
    return ADVERTISEMENT_OR_BOILERPLATE.some((marker) => marker.test(sentence));
  }

  /**
   * Checks if sentence is predominantly opinion or rhetorical flourish
   */
  private isOpinionOrRhetoric(sentence: string): boolean {
    if (sentence.endsWith('?')) {
      return true; // Rhetorical question
    }

    const hasOpinionMarker = OPINION_MARKERS.some((marker) => marker.test(sentence));
    const hasFactualMarker =
      STATISTICAL_REGEX.test(sentence) ||
      ATTRIBUTED_REGEX.test(sentence) ||
      GEOGRAPHIC_REGEX.test(sentence) ||
      TEMPORAL_REGEX.test(sentence);

    if (hasOpinionMarker && !hasFactualMarker) {
      return true;
    }

    return false;
  }

  /**
   * Splits compound sentences joined by semicolons
   */
  private decomposeCompoundSentence(sentence: string): string[] {
    if (sentence.includes(';')) {
      return sentence.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    return [sentence];
  }

  /**
   * Classifies the factual domain of the claim
   */
  public classifyClaimType(statement: string): ClaimType {
    if (STATISTICAL_REGEX.test(statement)) {
      return 'numerical';
    }
    if (TEMPORAL_REGEX.test(statement)) {
      return 'temporal';
    }
    if (GEOGRAPHIC_REGEX.test(statement)) {
      return 'geographic';
    }
    if (POLITICAL_REGEX.test(statement)) {
      return 'political';
    }
    if (SCIENTIFIC_REGEX.test(statement)) {
      return 'scientific';
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
   * Calculates an importance score between 0.15 and 0.95
   */
  private calculateImportance(statement: string, paragraphIndex: number, totalParagraphs: number): number {
    let score = 0.55;

    // 1. Lead paragraph bonus (headline / primary thesis)
    if (paragraphIndex === 0) {
      score += 0.30;
    } else if (paragraphIndex === 1) {
      score += 0.15;
    }

    // 2. Numerical / Statistical precision bonus
    if (STATISTICAL_REGEX.test(statement)) {
      score += 0.15;
    }

    // 3. Central institutional / political action bonus
    if (POLITICAL_REGEX.test(statement) || ATTRIBUTED_REGEX.test(statement)) {
      score += 0.10;
    }

    // 4. Minor timing or low-significance timestamp penalty (e.g. "at 10:30 AM")
    if (/\b(at \d{1,2}:\d{2}|in the morning|in the afternoon|on a cloudy day|meanwhile)\b/i.test(statement)) {
      score -= 0.25;
    }

    // 5. Short trailing detail penalty
    if (paragraphIndex > totalParagraphs - 2 && statement.length < 40) {
      score -= 0.15;
    }

    // Clamp between 0.15 and 0.95 and round to 2 decimal places
    const clamped = Math.max(0.15, Math.min(0.95, score));
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
export default claimExtractorService;
