import { ExtractedClaim, ClaimType, ClaimClassification } from '../types/api.js';

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
  /\b(space|isro|nasa|climate|temperature|disease|vaccine|organism|species|ocean|orbit|atmosphere|quantum|physics|chemistry|planet|earth|flat|round|spherical|sun|moon)\b/i;

const ATTRIBUTED_REGEX =
  /\b(stated|announced|confirmed|reported|claimed|discovered|published|found that|demonstrated|according to|concluded|officials said)\b/i;

const HISTORICAL_REGEX = /\b(in (19\d{2}|20\d{2})|during the|historical|founded in|since (19\d{2}|20\d{2}))\b/i;

export class ClaimExtractorService {
  /**
   * Classifies a statement into one of the 9 standard Claim Classifications (Requirement 1):
   * OBJECTIVE_FACT, CURRENT_EVENT, HISTORICAL_FACT, NUMERICAL_FACT, COMPARATIVE_FACT,
   * PREDICTION, OPINION, BELIEF_OR_THEOLOGICAL, UNVERIFIABLE
   */
  public classifyClaimClassification(statement: string): {
    classification: ClaimClassification;
    isVerifiable: boolean;
    explanation?: string;
  } {
    const clean = statement.trim();
    const lower = clean.toLowerCase();

    // 1. Belief or Theological Claim (Requirement 8)
    // Generic theological / religious deity assertions:
    // e.g. "Ram is God", "Jesus is the Son of God", "Allah is the creator", "Vishnu is a supreme deity"
    const theologicalPattern =
      /\b(is god|is a god|is deity|is a deity|is lord|is the lord|is divine|is supreme deity|is the son of god|is prophet|is messenger of god|is reincarnation of|is avatar of|incarnation of god|is holy|is sacred|holy spirit|supreme creator|almighty|divine being|afterlife exists|reaches moksha|reaches nirvana|goes to heaven|goes to hell|destined for heaven|original sin)\b/i;

    if (
      theologicalPattern.test(clean) ||
      (/\b(god|allah|vishnu|shiva|brahma|jesus|yahweh|krishna|rama|ram)\b/i.test(lower) &&
        /\b(is|was)\s+(god|lord|creator|divine|almighty|supreme|omnipresent|omniscient)\b/i.test(lower))
    ) {
      return {
        classification: 'BELIEF_OR_THEOLOGICAL',
        isVerifiable: false,
        explanation:
          'This is a religious or theological claim rather than an objectively testable factual claim. Different religious traditions may hold different beliefs about it.',
      };
    }

    // 2. Future Prediction (Requirement 10)
    // e.g. "India will win the next World Cup", "The economy will collapse in 2027", "Humans will land on Mars by 2030"
    const predictionPattern =
      /\b(will win|will lose|will happen|will occur|will be|will become|will reach|will drop|will fall|will rise|will collapse|will crash|is predicted to|is expected to|is going to|forecasts that|predicts that|in the next\s+\w+|next world cup|by 203\d|by 204\d|by 205\d|in the future)\b/i;

    if (predictionPattern.test(clean) && !/\b(in (19\d{2}|20[0-2]\d))\b/i.test(clean)) {
      return {
        classification: 'PREDICTION',
        isVerifiable: false,
        explanation: 'Future outcomes cannot currently be verified as true or false.',
      };
    }

    // 3. Subjective Opinion / Aesthetic Judgment (Requirement 9)
    // e.g. "This movie is terrible", "Ram is the greatest character ever", "Pizza is the best food in the world"
    const opinionPattern =
      /\b(is terrible|is horrible|is awesome|is magnificent|is wonderful|is beautiful|is ugly|is the greatest\s+\w+\s+ever|is the best\s+\w+\s+ever|is the worst\s+\w+\s+ever|tastes (terrible|delicious|disgusting|amazing)|is boring|is overrated|is underrated|in my opinion|i believe that|i think that|personally speaking)\b/i;

    if (opinionPattern.test(clean)) {
      return {
        classification: 'OPINION',
        isVerifiable: false,
        explanation: 'Subjective opinion or personal aesthetic judgment that cannot be empirically verified.',
      };
    }

    // 4. Comparative Fact
    if (
      /\b(larger than|smaller than|bigger than|hotter than|colder than|faster than|slower than|more than|less than|highest|lowest|largest|smallest|biggest|deepest|longest|tallest|most populous|least populous)\b/i.test(
        clean
      )
    ) {
      return {
        classification: 'COMPARATIVE_FACT',
        isVerifiable: true,
      };
    }

    // 5. Numerical Fact
    if (
      STATISTICAL_REGEX.test(clean) ||
      /\b(boils at|freezes at|melts at|\d+\s*(°\s*c|celsius|km|miles|meters|kg|tons))\b/i.test(clean)
    ) {
      return {
        classification: 'NUMERICAL_FACT',
        isVerifiable: true,
      };
    }

    // 6. Current Event (Time-sensitive leadership, elections, tournament winner in 2026/current)
    if (
      /\b(now|currently|current|latest|recently|today|this week|2026|winner|captain|president|prime minister|chief minister)\b/i.test(
        clean
      )
    ) {
      return {
        classification: 'CURRENT_EVENT',
        isVerifiable: true,
      };
    }

    // 7. Historical Fact
    if (
      HISTORICAL_REGEX.test(clean) ||
      /\b(in (19\d{2}|200\d|201\d|202[0-5])|century|ancient|founded in|built in|during the war|independence)\b/i.test(
        clean
      )
    ) {
      return {
        classification: 'HISTORICAL_FACT',
        isVerifiable: true,
      };
    }

    // 8. Objective Fact (General factual, geographic, scientific, shape assertions)
    return {
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };
  }

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
        if (sentence.length < 5) continue;
        if (this.isAdvertisementOrBoilerplate(sentence)) continue;

        // 2. Break compound statements into atomic assertions if distinct facts exist
        const atomicStatements = this.decomposeCompoundSentence(sentence);

        for (const statement of atomicStatements) {
          const cleanStmt = statement.trim();
          if (cleanStmt.length < 5) continue;

          const claimType = this.classifyClaimType(cleanStmt);
          const classInfo = this.classifyClaimClassification(cleanStmt);
          const importance = this.calculateImportance(cleanStmt, pIndex, paragraphs.length);

          extractedClaims.push({
            id: `claim-${claimCounter++}`,
            text: this.normalizeClaimText(cleanStmt),
            importance,
            claim_type: claimType,
            claimType: claimType,
            classification: classInfo.classification,
            isVerifiable: classInfo.isVerifiable,
            notVerifiableReason: classInfo.explanation,
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
