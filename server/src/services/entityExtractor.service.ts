import { ExtractedEntities } from '../types/api.js';

// Common geographic containment dictionary for high-precision entity resolution
const LOCATION_HIERARCHY: Record<string, string[]> = {
  ayodhya: ['uttar pradesh', 'up', 'india', 'bharat', 'faizabad'],
  delhi: ['india', 'bharat', 'ncr', 'new delhi'],
  mumbai: ['maharashtra', 'india', 'bharat'],
  kolkata: ['west bengal', 'india', 'bharat'],
  chennai: ['tamil nadu', 'india', 'bharat'],
  bengaluru: ['karnataka', 'india', 'bharat'],
  bangalore: ['karnataka', 'india', 'bharat'],
  hyderabad: ['telangana', 'india', 'bharat'],
  ahmedabad: ['gujarat', 'india', 'bharat'],
  lucknow: ['uttar pradesh', 'up', 'india', 'bharat'],
  varanasi: ['uttar pradesh', 'up', 'india', 'bharat'],
  patna: ['bihar', 'india', 'bharat'],
  jaipur: ['rajasthan', 'india', 'bharat'],
  chandigarh: ['punjab', 'haryana', 'india', 'bharat'],
  bhopal: ['madhya pradesh', 'mp', 'india', 'bharat'],
  washington: ['united states', 'usa', 'us', 'america'],
  london: ['united kingdom', 'uk', 'england', 'britain'],
  paris: ['france', 'europe'],
  tokyo: ['japan', 'asia'],
  beijing: ['china', 'asia'],
};

export class EntityExtractorService {
  /**
   * Normalizes claim text
   */
  public normalizeClaim(claimText: string): string {
    return (claimText || '')
      .replace(/[“”"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts named entities, locations, dates, numbers, and organizations
   */
  public extractEntities(text: string): ExtractedEntities {
    const cleanText = this.normalizeClaim(text);
    const lower = cleanText.toLowerCase();

    const locations: string[] = [];
    const organizations: string[] = [];
    const dates: string[] = [];
    const numbers: string[] = [];
    const people: string[] = [];
    const events: string[] = [];

    // 1. Locations
    const knownLocations = [
      'india', 'bharat', 'delhi', 'new delhi', 'ayodhya', 'uttar pradesh', 'up', 'mumbai',
      'kolkata', 'chennai', 'bengaluru', 'bangalore', 'hyderabad', 'ahmedabad', 'lucknow',
      'varanasi', 'bihar', 'patna', 'rajasthan', 'jaipur', 'kashmir', 'punjab', 'gujarat',
      'kerala', 'tamil nadu', 'maharashtra', 'karnataka', 'assam', 'united states', 'usa',
      'uk', 'london', 'china', 'russia', 'ukraine', 'pakistan', 'israel', 'gaza', 'france',
    ];

    for (const loc of knownLocations) {
      const regex = new RegExp(`\\b${loc}\\b`, 'i');
      if (regex.test(lower)) {
        locations.push(loc);
      }
    }

    // 2. Numbers & Percentages
    const numMatches = cleanText.match(/(\d+(\.\d+)?%|\$\d+(\.\d+)?|\b\d+\s*(crore|lakh|billion|million|trillion|percent|cases|km|tons)\b|\b\d{1,4}\b)/gi) || [];
    for (const n of numMatches) {
      if (n.length >= 1 && !dates.includes(n)) {
        numbers.push(n);
      }
    }

    // 3. Dates & Years
    const dateMatches = cleanText.match(/(\b(19\d{2}|20\d{2})\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(,\s+\d{4})?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/gi) || [];
    for (const d of dateMatches) {
      dates.push(d);
    }

    // 4. Organizations
    const knownOrgs = [
      'rbi', 'reserve bank of india', 'isro', 'nasa', 'who', 'un', 'supreme court',
      'high court', 'election commission', 'pib', 'bjp', 'congress', 'aap', 'parliament',
      'lok sabha', 'rajya sabha', 'nso', 'national statistical office', 'aiims', 'drdo',
      'bcci', 'icc', 'unesco', 'world bank', 'imf',
    ];

    for (const org of knownOrgs) {
      const regex = new RegExp(`\\b${org}\\b`, 'i');
      if (regex.test(lower)) {
        organizations.push(org);
      }
    }

    // 5. Specific Monuments / Temples / Events
    if (/ram mandir|ram janmbhoomi/i.test(cleanText)) {
      events.push('Ram Mandir');
    }
    if (/chandrayaan/i.test(cleanText)) {
      events.push('Chandrayaan');
    }
    if (/election/i.test(cleanText)) {
      events.push('Election');
    }

    return {
      people: Array.from(new Set(people)),
      organizations: Array.from(new Set(organizations)),
      locations: Array.from(new Set(locations)),
      dates: Array.from(new Set(dates)),
      numbers: Array.from(new Set(numbers)),
      events: Array.from(new Set(events)),
    };
  }

  /**
   * Resolves whether two locations are compatible, hierarchical, or mutually exclusive
   * e.g. Ayodhya in India -> compatible (supports)
   * e.g. Ayodhya in Delhi -> mutually exclusive (contradicts)
   */
  public checkLocationCompatibility(claimLoc: string, evidenceLoc: string): 'SUPPORTIVE' | 'CONTRADICTORY' | 'UNRELATED' {
    const cLoc = claimLoc.toLowerCase().trim();
    const eLoc = evidenceLoc.toLowerCase().trim();

    if (cLoc === eLoc) return 'SUPPORTIVE';

    // Check if claim location contains evidence location (e.g. India contains Ayodhya)
    if (LOCATION_HIERARCHY[eLoc] && LOCATION_HIERARCHY[eLoc].includes(cLoc)) {
      return 'SUPPORTIVE';
    }

    // Check if evidence location contains claim location (e.g. Evidence says India, claim says Ayodhya)
    if (LOCATION_HIERARCHY[cLoc] && LOCATION_HIERARCHY[cLoc].includes(eLoc)) {
      return 'SUPPORTIVE';
    }

    // Both are distinct specific cities/states in the same hierarchy without containment
    if (LOCATION_HIERARCHY[cLoc] && LOCATION_HIERARCHY[eLoc]) {
      // e.g. Delhi vs Ayodhya: both have hierarchy lists that do not include each other
      return 'CONTRADICTORY';
    }

    return 'UNRELATED';
  }
}

export const entityExtractorService = new EntityExtractorService();
export default entityExtractorService;
