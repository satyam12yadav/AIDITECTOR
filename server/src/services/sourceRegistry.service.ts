import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface VerifiedSourceRecord {
  name: string;
  url: string;
  domain: string;
  category: string;
  isFactChecker: boolean;
  isWireService: boolean;
  trustWeight: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SourceRegistryService {
  private sources: VerifiedSourceRecord[] = [];
  private domainMap: Map<string, VerifiedSourceRecord> = new Map();

  constructor() {
    this.loadDatabase();
  }

  private loadDatabase() {
    try {
      const dbPath = path.resolve(__dirname, '../data/trustedSources.json');
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        this.sources = JSON.parse(raw);
        for (const s of this.sources) {
          const normDomain = this.normalizeDomain(s.domain);
          this.domainMap.set(normDomain, s);
          // Also set subdomains or root domains
          const parts = normDomain.split('.');
          if (parts.length > 2) {
            const root = parts.slice(-2).join('.');
            if (!this.domainMap.has(root)) {
              this.domainMap.set(root, s);
            }
          }
        }
      }
    } catch (err) {
      console.error('[SourceRegistryService] Failed to load trusted sources:', err);
    }
  }

  public normalizeDomain(inputUrlOrDomain: string): string {
    let d = (inputUrlOrDomain || '').toLowerCase().trim();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (d.includes('/')) {
      d = d.split('/')[0];
    }
    if (d.includes(':')) {
      d = d.split(':')[0];
    }
    return d;
  }

  public matchSource(urlOrDomain: string): VerifiedSourceRecord | null {
    const norm = this.normalizeDomain(urlOrDomain);
    if (!norm) return null;

    if (this.domainMap.has(norm)) {
      return this.domainMap.get(norm)!;
    }

    // Try suffix match
    for (const [dom, record] of this.domainMap.entries()) {
      if (norm === dom || norm.endsWith(`.${dom}`) || dom.endsWith(`.${norm}`)) {
        return record;
      }
    }

    return null;
  }

  public getTrustScore(urlOrDomain: string): { trustWeight: number; isVerified: boolean; category: string } {
    const match = this.matchSource(urlOrDomain);
    if (match) {
      return {
        trustWeight: match.trustWeight,
        isVerified: true,
        category: match.category,
      };
    }
    return {
      trustWeight: 0.5,
      isVerified: false,
      category: 'Unverified External Domain',
    };
  }

  public getAllVerifiedSources(): VerifiedSourceRecord[] {
    return this.sources;
  }
}

export const sourceRegistry = new SourceRegistryService();
export default sourceRegistry;
