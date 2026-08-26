import { ExaRetrievedSource } from './exaSearch.service.js';

export class RagContextBuilder {
  /**
   * Constructs a clean, structured RAG context string from a claim and retrieved sources
   */
  public buildRagContext(claim: string, sources: ExaRetrievedSource[], maxSources = 8): string {
    const lines: string[] = [];

    lines.push(`CLAIM: ${claim.trim()}\n`);
    lines.push(`RETRIEVED AUTHORITATIVE EVIDENCE (${sources.length} sources gathered):\n`);

    // Filter to relevant sources with relevance >= 0.15 and sort by retrievalRelevance
    const candidateSources = sources
      .filter((s) => s.retrievalRelevance >= 0.15)
      .slice(0, maxSources);

    if (candidateSources.length === 0) {
      lines.push('NO RELEVANT EVIDENCE FOUND.');
      return lines.join('\n');
    }

    candidateSources.forEach((src, idx) => {
      lines.push(`SOURCE ${idx + 1}`);
      lines.push(`Title: ${src.title || 'Untitled Source'}`);
      lines.push(`Date: ${src.publishedDate || 'Date Unknown'}`);
      lines.push(`Domain: ${src.domain}`);
      lines.push(`URL: ${src.url}`);
      lines.push(`Availability: ${src.contentAvailability}`);
      lines.push(`Relevance: ${Math.round(src.retrievalRelevance * 100)}%`);
      if (src.possibleDuplicate) {
        lines.push(`Duplicate Note: Possible syndicated or republicated story`);
      }
      lines.push(`Content:\n${src.content.trim()}`);
      lines.push('\n---\n');
    });

    return lines.join('\n').trim();
  }
}

export const ragContextBuilder = new RagContextBuilder();
export default ragContextBuilder;
