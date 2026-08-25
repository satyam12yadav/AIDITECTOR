import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOURCE_TIER_CONFIG, SourceTierDefinition } from '../config/sourceTiers.js';

export interface NormalizedSourceRecord {
  name: string;
  url: string;
  domain: string;
  category: string;
  credibilityTier: 1 | 2 | 3 | 4 | 5;
  credibilityWeight: number;
  isOfficial: boolean;
  isFactChecker: boolean;
  isWireService: boolean;
}

export interface SourceEvaluation {
  name: string;
  domain: string;
  category: string;
  credibilityTier: 1 | 2 | 3 | 4 | 5;
  credibilityWeight: number;
  badge: string;
  isRegistered: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SourceRegistryService {
  private sources: NormalizedSourceRecord[] = [];
  private domainMap: Map<string, NormalizedSourceRecord> = new Map();

  constructor() {
    this.loadRegistry();
  }

  /**
   * Loads and normalizes the source registry from the JSON database or Excel definition
   */
  private loadRegistry() {
    try {
      const jsonPath = path.resolve(__dirname, '../data/sourceRegistry.json');
      const fallbackJsonPath = path.resolve(__dirname, '../data/trustedSources.json');

      let targetPath = jsonPath;
      if (!fs.existsSync(targetPath) && fs.existsSync(fallbackJsonPath)) {
        targetPath = fallbackJsonPath;
      }

      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        const parsed = JSON.parse(raw);

        this.sources = parsed.map((item: any) => {
          const tier: 1 | 2 | 3 | 4 | 5 = item.credibilityTier || (item.isFactChecker ? 2 : item.isWireService ? 3 : 4);
          const tierDef = SOURCE_TIER_CONFIG[tier] || SOURCE_TIER_CONFIG[5];

          return {
            name: item.name,
            url: item.url,
            domain: this.normalizeDomain(item.domain || item.url),
            category: item.category || 'Verified Media',
            credibilityTier: tier,
            credibilityWeight: item.credibilityWeight || tierDef.baseWeight,
            isOfficial: Boolean(item.isOfficial),
            isFactChecker: Boolean(item.isFactChecker),
            isWireService: Boolean(item.isWireService),
          };
        });

        // Index domains
        for (const s of this.sources) {
          const normDomain = s.domain;
          this.domainMap.set(normDomain, s);

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
      console.error('[SourceRegistryService] Failed to load source registry:', err);
    }
  }

  /**
   * Normalizes URLs and domain names into a canonical root hostname
   */
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

  /**
   * Matches a URL or publisher name against the normalized 54-source registry
   */
  public matchSource(urlOrDomain: string): NormalizedSourceRecord | null {
    const norm = this.normalizeDomain(urlOrDomain);
    if (!norm) return null;

    // Direct domain match
    if (this.domainMap.has(norm)) {
      return this.domainMap.get(norm)!;
    }

    // Subdomain or suffix matching
    for (const [dom, record] of this.domainMap.entries()) {
      if (norm === dom || norm.endsWith(`.${dom}`) || dom.endsWith(`.${norm}`)) {
        return record;
      }
    }

    // Name-based fuzzy search
    const lowerInput = urlOrDomain.toLowerCase().trim();
    for (const record of this.sources) {
      if (lowerInput.includes(record.name.toLowerCase()) || record.name.toLowerCase().includes(lowerInput)) {
        return record;
      }
    }

    return null;
  }

  /**
   * Evaluates source credibility tier and weight
   */
  public getSourceCredibility(urlOrDomain: string): SourceEvaluation {
    const match = this.matchSource(urlOrDomain);
    if (match) {
      const tierDef = SOURCE_TIER_CONFIG[match.credibilityTier];
      return {
        name: match.name,
        domain: match.domain,
        category: match.category,
        credibilityTier: match.credibilityTier,
        credibilityWeight: match.credibilityWeight,
        badge: tierDef.badge,
        isRegistered: true,
      };
    }

    // Check generic institutional domains for Tier 1
    const norm = this.normalizeDomain(urlOrDomain);
    if (
      norm.endsWith('.gov') ||
      norm.endsWith('.gov.in') ||
      norm.endsWith('.nic.in') ||
      norm.includes('who.int') ||
      norm.includes('un.org') ||
      norm.includes('rbi.org') ||
      norm.includes('nasa.gov') ||
      norm.includes('nih.gov') ||
      norm.includes('cdc.gov')
    ) {
      return {
        name: norm,
        domain: norm,
        category: 'Official Government / Institutional Portal',
        credibilityTier: 1,
        credibilityWeight: SOURCE_TIER_CONFIG[1].baseWeight,
        badge: SOURCE_TIER_CONFIG[1].badge,
        isRegistered: true,
      };
    }

    // Check academic and peer-reviewed scientific authorities for Tier 2
    if (
      norm.endsWith('.edu') ||
      norm.endsWith('.ac.in') ||
      norm.endsWith('.ac.uk') ||
      norm.includes('nature.com') ||
      norm.includes('science.org') ||
      norm.includes('sciencedirect.com') ||
      norm.includes('thelancet.com') ||
      norm.includes('pnas.org')
    ) {
      return {
        name: norm,
        domain: norm,
        category: 'Academic / Peer-Reviewed Authority',
        credibilityTier: 2,
        credibilityWeight: SOURCE_TIER_CONFIG[2].baseWeight,
        badge: 'Tier 2: Academic Authority',
        isRegistered: true,
      };
    }

    // Tier 5: Default Unregistered Web Source
    return {
      name: norm || 'Unverified Domain',
      domain: norm,
      category: 'Unverified External Domain',
      credibilityTier: 5,
      credibilityWeight: SOURCE_TIER_CONFIG[5].baseWeight,
      badge: SOURCE_TIER_CONFIG[5].badge,
      isRegistered: false,
    };
  }

  /**
   * Returns all loaded source records
   */
  public getAllSources(): NormalizedSourceRecord[] {
    return this.sources;
  }
}

export const sourceRegistry = new SourceRegistryService();
export default sourceRegistry;
