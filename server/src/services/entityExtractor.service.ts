import { ExtractedEntities } from '../types/api.js';

// Comprehensive continental & regional geographic containment dictionary
const LOCATION_HIERARCHY: Record<string, string[]> = {
  // Cities & Regions -> States -> Countries -> Continents
  ayodhya: ['uttar pradesh', 'up', 'india', 'bharat', 'south asia', 'asia', 'faizabad'],
  delhi: ['india', 'bharat', 'south asia', 'asia', 'ncr', 'new delhi'],
  'new delhi': ['india', 'bharat', 'south asia', 'asia', 'delhi', 'ncr'],
  mumbai: ['maharashtra', 'india', 'bharat', 'south asia', 'asia'],
  kolkata: ['west bengal', 'india', 'bharat', 'south asia', 'asia'],
  chennai: ['tamil nadu', 'india', 'bharat', 'south asia', 'asia'],
  bengaluru: ['karnataka', 'india', 'bharat', 'south asia', 'asia'],
  bangalore: ['karnataka', 'india', 'bharat', 'south asia', 'asia'],
  hyderabad: ['telangana', 'india', 'bharat', 'south asia', 'asia'],
  ahmedabad: ['gujarat', 'india', 'bharat', 'south asia', 'asia'],
  lucknow: ['uttar pradesh', 'up', 'india', 'bharat', 'south asia', 'asia'],
  varanasi: ['uttar pradesh', 'up', 'india', 'bharat', 'south asia', 'asia'],
  patna: ['bihar', 'india', 'bharat', 'south asia', 'asia'],
  jaipur: ['rajasthan', 'india', 'bharat', 'south asia', 'asia'],
  chandigarh: ['punjab', 'haryana', 'india', 'bharat', 'south asia', 'asia'],
  bhopal: ['madhya pradesh', 'mp', 'india', 'bharat', 'south asia', 'asia'],
  'uttar pradesh': ['india', 'bharat', 'south asia', 'asia', 'up'],
  up: ['india', 'bharat', 'south asia', 'asia'],
  kashmir: ['india', 'bharat', 'south asia', 'asia'],
  kerala: ['india', 'bharat', 'south asia', 'asia'],
  punjab: ['india', 'bharat', 'south asia', 'asia'],
  gujarat: ['india', 'bharat', 'south asia', 'asia'],
  maharashtra: ['india', 'bharat', 'south asia', 'asia'],
  karnataka: ['india', 'bharat', 'south asia', 'asia'],
  'tamil nadu': ['india', 'bharat', 'south asia', 'asia'],
  bihar: ['india', 'bharat', 'south asia', 'asia'],
  rajasthan: ['india', 'bharat', 'south asia', 'asia'],
  assam: ['india', 'bharat', 'south asia', 'asia'],
  'west bengal': ['india', 'bharat', 'south asia', 'asia'],

  // Countries -> Continents
  india: ['asia', 'south asia', 'bharat', 'indian subcontinent'],
  bharat: ['asia', 'south asia', 'india', 'indian subcontinent'],
  'south asia': ['asia', 'indian subcontinent'],
  'east asia': ['asia'],
  pakistan: ['asia', 'south asia', 'indian subcontinent'],
  bangladesh: ['asia', 'south asia', 'indian subcontinent'],
  sri_lanka: ['asia', 'south asia', 'indian subcontinent'],
  china: ['asia', 'east asia'],
  japan: ['asia', 'east asia'],
  russia: ['asia', 'europe', 'eurasia'],
  france: ['europe', 'european union', 'eu'],
  paris: ['france', 'europe', 'european union'],
  germany: ['europe', 'european union', 'eu'],
  'united kingdom': ['europe', 'uk', 'britain', 'england'],
  uk: ['europe', 'united kingdom', 'britain'],
  london: ['united kingdom', 'uk', 'england', 'britain', 'europe'],
  'united states': ['north america', 'americas', 'usa', 'us', 'america'],
  usa: ['north america', 'americas', 'united states', 'us', 'america'],
  washington: ['united states', 'usa', 'us', 'america', 'north america'],
  ukraine: ['europe'],
  israel: ['asia', 'middle east'],
  egypt: ['africa', 'middle east'],

  // Continents
  asia: ['eastern hemisphere', 'eurasia', 'world'],
  europe: ['western hemisphere', 'eurasia', 'world'],
  africa: ['eastern hemisphere', 'world'],
  'north america': ['americas', 'western hemisphere', 'world'],
  'south america': ['americas', 'western hemisphere', 'world'],
  australia: ['oceania', 'world'],
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

    // 1. Locations (Ordered from longest to shortest to match multi-word names first)
    const knownLocations = [
      'south america', 'north america', 'south asia', 'east asia', 'new delhi', 'uttar pradesh',
      'west bengal', 'tamil nadu', 'united states', 'united kingdom', 'middle east',
      'india', 'bharat', 'delhi', 'ayodhya', 'up', 'mumbai', 'kolkata', 'chennai',
      'bengaluru', 'bangalore', 'hyderabad', 'ahmedabad', 'lucknow', 'varanasi', 'bihar',
      'patna', 'rajasthan', 'jaipur', 'kashmir', 'punjab', 'gujarat', 'kerala', 'maharashtra',
      'karnataka', 'assam', 'usa', 'uk', 'london', 'china', 'russia', 'ukraine', 'pakistan',
      'israel', 'gaza', 'france', 'germany', 'japan', 'egypt', 'asia', 'europe', 'africa',
      'australia', 'antarctica',
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
   * e.g. India in Asia -> compatible (supports)
   * e.g. India in Europe -> mutually exclusive (contradicts)
   * e.g. Ayodhya in India -> compatible (supports)
   * e.g. Ayodhya in Delhi -> mutually exclusive (contradicts)
   */
  public checkLocationCompatibility(claimLoc: string, evidenceLoc: string): 'SUPPORTIVE' | 'CONTRADICTORY' | 'UNRELATED' {
    const cLoc = claimLoc.toLowerCase().trim();
    const eLoc = evidenceLoc.toLowerCase().trim();

    if (cLoc === eLoc) return 'SUPPORTIVE';

    // 1. Direct containment: e.g. LOCATION_HIERARCHY['india'].includes('asia')
    if (LOCATION_HIERARCHY[eLoc] && LOCATION_HIERARCHY[eLoc].includes(cLoc)) {
      return 'SUPPORTIVE';
    }

    if (LOCATION_HIERARCHY[cLoc] && LOCATION_HIERARCHY[cLoc].includes(eLoc)) {
      return 'SUPPORTIVE';
    }

    // 2. Transitive containment: e.g. Ayodhya -> UP -> India -> Asia
    const cParents = LOCATION_HIERARCHY[cLoc] || [];
    const eParents = LOCATION_HIERARCHY[eLoc] || [];

    if (cParents.some((p) => eParents.includes(p) || p === eLoc)) {
      return 'SUPPORTIVE';
    }

    // 3. Mutually exclusive distinct continents or distinct non-overlapping countries
    const continents = ['asia', 'europe', 'africa', 'north america', 'south america', 'australia', 'antarctica'];
    const isCContinent = continents.includes(cLoc);
    const isEContinent = continents.includes(eLoc);

    if (isCContinent && isEContinent && cLoc !== eLoc) {
      return 'CONTRADICTORY';
    }

    // Country assigned to wrong continent: e.g. Claim states India in Europe, evidence states India in Asia
    if (isCContinent && !cParents.includes(cLoc) && (eParents.includes(eLoc) || eLoc === 'asia' || eLoc === 'south asia')) {
      return 'CONTRADICTORY';
    }

    if (LOCATION_HIERARCHY[cLoc] && LOCATION_HIERARCHY[eLoc]) {
      return 'CONTRADICTORY';
    }

    return 'UNRELATED';
  }
}

export const entityExtractorService = new EntityExtractorService();
export default entityExtractorService;
