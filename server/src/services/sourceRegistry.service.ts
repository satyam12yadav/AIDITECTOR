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
  reliabilityScore: number; // 20 - 100
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
          const isGov = item.domain && (item.domain.endsWith('.gov') || item.domain.endsWith('.gov.in') || item.domain.endsWith('.nic.in'));
          let tier: 1 | 2 | 3 | 4 | 5 = item.credibilityTier || 4;
          if (item.isOfficial || isGov) tier = 1;
          else if (item.isFactChecker) tier = 3;
          else if (item.isWireService) tier = 2;
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
   * Matches a URL or publisher name against the normalized source registry
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
   * Evaluates source credibility tier and reliability score (20 - 100)
   */
  public getSourceCredibility(urlOrDomain: string): SourceEvaluation {
    const match = this.matchSource(urlOrDomain);
    if (match) {
      const tierDef = SOURCE_TIER_CONFIG[match.credibilityTier];
      const relScore = Math.round(match.credibilityWeight * 100);
      return {
        name: match.name,
        domain: match.domain,
        category: match.category,
        credibilityTier: match.credibilityTier,
        credibilityWeight: match.credibilityWeight,
        reliabilityScore: Math.max(tierDef.reliabilityRange[0], Math.min(tierDef.reliabilityRange[1], relScore)),
        badge: tierDef.badge,
        isRegistered: true,
      };
    }

    const norm = this.normalizeDomain(urlOrDomain);

    // Tier 1 — Official / Primary Authorities & Statutory Bodies
    if (
      norm.endsWith('.gov') ||
      norm.endsWith('.gov.in') ||
      norm.endsWith('.nic.in') ||
      norm.endsWith('.mil') ||
      norm.endsWith('.edu') ||
      norm.endsWith('.ac.in') ||
      norm.includes('bcci.tv') ||
      norm.includes('icc-cricket.com') ||
      norm.includes('fifa.com') ||
      norm.includes('olympics.com') ||
      norm.includes('uefa.com') ||
      norm.includes('fide.com') ||
      norm.includes('rbi.org.in') ||
      norm.includes('eci.gov.in') ||
      norm.includes('isro.gov.in') ||
      norm.includes('who.int') ||
      norm.includes('un.org') ||
      norm.includes('nasa.gov') ||
      norm.includes('nih.gov') ||
      norm.includes('cdc.gov') ||
      norm.includes('supremecourt')
    ) {
      return {
        name: norm.includes('bcci') ? 'BCCI' : norm.includes('icc') ? 'ICC' : norm.includes('rbi') ? 'Reserve Bank of India' : norm,
        domain: norm,
        category: 'Official Government / Institutional Authority',
        credibilityTier: 1,
        credibilityWeight: SOURCE_TIER_CONFIG[1].baseWeight,
        reliabilityScore: 98,
        badge: SOURCE_TIER_CONFIG[1].badge,
        isRegistered: true,
      };
    }

    // Tier 3 — Recognized IFCN Fact-Checking Organizations
    if (
      norm.includes('boomlive') ||
      norm.includes('altnews') ||
      norm.includes('snopes') ||
      norm.includes('factly') ||
      norm.includes('vishvasnews') ||
      norm.includes('newschecker') ||
      norm.includes('factcheck')
    ) {
      return {
        name: norm,
        domain: norm,
        category: 'Recognized Fact-Checking Organization',
        credibilityTier: 3,
        credibilityWeight: SOURCE_TIER_CONFIG[3].baseWeight,
        reliabilityScore: 88,
        badge: SOURCE_TIER_CONFIG[3].badge,
        isRegistered: true,
      };
    }

    // Tier 2 — Highly Reliable Independent News & Wire Services
    if (
      norm.includes('reuters.com') ||
      norm.includes('apnews.com') ||
      norm.includes('afp.com') ||
      norm.includes('ptinews.com') ||
      norm.includes('thehindu.com') ||
      norm.includes('indianexpress.com') ||
      norm.includes('bbc.com') ||
      norm.includes('nytimes.com') ||
      norm.includes('wsj.com') ||
      norm.includes('theguardian.com') ||
      norm.includes('bloomberg.com') ||
      norm.includes('espncricinfo.com')
    ) {
      return {
        name: norm,
        domain: norm,
        category: 'Highly Reliable Independent News & Wire Service',
        credibilityTier: 2,
        credibilityWeight: SOURCE_TIER_CONFIG[2].baseWeight,
        reliabilityScore: 90,
        badge: SOURCE_TIER_CONFIG[2].badge,
        isRegistered: true,
      };
    }

    // Tier 4 — General Publishers & Reference Archives
    if (
      norm === 'wikipedia.org' ||
      norm.endsWith('.wikipedia.org') ||
      norm === 'wikipedia' ||
      norm === 'britannica.com' ||
      norm.endsWith('.britannica.com') ||
      norm === 'nationalgeographic.com' ||
      norm.includes('scroll.in') ||
      norm.includes('thewire.in') ||
      norm.includes('livemint.com') ||
      norm.includes('moneycontrol.com')
    ) {
      return {
        name: norm.includes('britannica') ? 'Encyclopædia Britannica' : norm.includes('wikipedia') ? 'Wikipedia Knowledge Archive' : norm.includes('nationalgeographic') ? 'National Geographic' : norm,
        domain: norm,
        category: 'General Publisher / Reference Repository',
        credibilityTier: 4,
        credibilityWeight: SOURCE_TIER_CONFIG[4].baseWeight,
        reliabilityScore: 72,
        badge: SOURCE_TIER_CONFIG[4].badge,
        isRegistered: true,
      };
    }

    // Tier 5 — Unknown / Low Trust Source
    return {
      name: norm || 'Unverified Domain',
      domain: norm,
      category: 'Unknown / Low Trust Web Source',
      credibilityTier: 5,
      credibilityWeight: SOURCE_TIER_CONFIG[5].baseWeight,
      reliabilityScore: 35,
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
