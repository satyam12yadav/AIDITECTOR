import { ExtractedEntities, SubClaim } from '../types/api.js';

export interface ClaimTriple {
  entity: string;
  attribute:
    | 'location'
    | 'capital'
    | 'shape'
    | 'superlative'
    | 'composition'
    | 'numerical'
    | 'temporal'
    | 'scientific'
    | 'ruling_party'
    | 'role_holder'
    | 'transition'
    | 'winner'
    | 'ownership'
    | 'quantity'
    | 'comparison'
    | 'general';
  claimValue: string;
  unit?: string;
  numericVal?: number;
  isNegated?: boolean;
  temporalType?: 'CURRENT' | 'PAST' | 'NEVER' | 'FUTURE';
  role?: string;
  holder?: string;
  replacedEntity?: string;
  year?: string;
  tournament?: string;
  superlativeType?: string;
  category?: string;
  scope?: string;
  property?: string;
}

export interface EvidenceTriple {
  entity: string;
  attribute: string;
  evidenceValue: string;
  locations: string[];
  unit?: string;
  numericVal?: number;
}

// Comprehensive continental & regional geographic containment dictionary
export const LOCATION_HIERARCHY: Record<string, string[]> = {
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
  india: ['south asia', 'asia', 'bharat', 'indian subcontinent'],
  bharat: ['south asia', 'asia', 'india', 'indian subcontinent'],
  'south asia': ['asia', 'indian subcontinent'],
  'east asia': ['asia'],
  pakistan: ['south asia', 'asia', 'indian subcontinent'],
  bangladesh: ['south asia', 'asia', 'indian subcontinent'],
  sri_lanka: ['south asia', 'asia', 'indian subcontinent'],
  china: ['east asia', 'asia'],
  japan: ['east asia', 'asia'],
  russia: ['asia', 'europe', 'eurasia'],
  france: ['europe', 'european union', 'eu'],
  paris: ['france', 'europe', 'european union'],
  germany: ['europe', 'european union', 'eu'],
  berlin: ['germany', 'europe', 'european union'],
  'united kingdom': ['europe', 'uk', 'britain', 'england'],
  uk: ['europe', 'united kingdom', 'britain'],
  london: ['united kingdom', 'uk', 'england', 'britain', 'europe'],
  'united states': ['north america', 'americas', 'usa', 'us', 'america'],
  usa: ['north america', 'americas', 'united states', 'us', 'america'],
  washington: ['united states', 'usa', 'us', 'america', 'north america'],
  ukraine: ['europe'],
  israel: ['middle east', 'asia'],
  egypt: ['middle east', 'africa'],
  brazil: ['south america', 'americas'],
  argentina: ['south america', 'americas'],

  // Continents
  asia: ['eastern hemisphere', 'eurasia', 'world'],
  europe: ['eurasia', 'world'],
  africa: ['eastern hemisphere', 'world'],
  'north america': ['americas', 'western hemisphere', 'world'],
  'south america': ['americas', 'western hemisphere', 'world'],
  australia: ['oceania', 'world'],
  antarctica: ['world'],
};

const KNOWN_COUNTRIES = new Set([
  'india', 'bharat', 'pakistan', 'china', 'japan', 'bangladesh', 'sri lanka',
  'united states', 'usa', 'united kingdom', 'uk', 'france', 'germany', 'russia',
  'ukraine', 'israel', 'egypt', 'brazil', 'argentina', 'canada', 'australia'
]);

const KNOWN_CONTINENTS = new Set([
  'asia', 'europe', 'africa', 'north america', 'south america', 'australia', 'antarctica'
]);

export class EntityExtractorService {
  /**
   * Normalizes claim text with standard quotes
   */
  public normalizeClaim(claimText: string): string {
    return (claimText || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
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

    // 1. Locations (Ordered from longest to shortest)
    const knownLocations = [
      'south america', 'north america', 'south asia', 'east asia', 'new delhi', 'uttar pradesh',
      'west bengal', 'tamil nadu', 'united states', 'united kingdom', 'middle east',
      'india', 'bharat', 'delhi', 'ayodhya', 'up', 'mumbai', 'kolkata', 'chennai',
      'bengaluru', 'bangalore', 'hyderabad', 'ahmedabad', 'lucknow', 'varanasi', 'bihar',
      'patna', 'rajasthan', 'jaipur', 'kashmir', 'punjab', 'gujarat', 'kerala', 'maharashtra',
      'karnataka', 'assam', 'usa', 'uk', 'london', 'china', 'russia', 'ukraine', 'pakistan',
      'israel', 'gaza', 'france', 'germany', 'japan', 'egypt', 'brazil', 'argentina', 'asia',
      'europe', 'africa', 'australia', 'antarctica',
    ];

    for (const loc of knownLocations) {
      const regex = new RegExp(`\\b${loc}\\b`, 'i');
      if (regex.test(lower)) {
        locations.push(loc);
      }
    }

    // 2. Numbers & Quantities (including decimal numbers & elevations)
    const numMatches = cleanText.match(/(₹\s*\d+([,.]\d+)*\s*(crore|lakh)?|\$\s*\d+([,.]\d+)*\s*(billion|million|trillion)?|\b\d+([,.]\d+)*\s*(crore|lakh|billion|million|trillion|percent|%|cases|deaths|tons|km|meters|metres|degrees|celsius|jobs)\b|\b\d{1,4}\b)/gi) || [];
    for (const n of numMatches) {
      if (n.length >= 1 && !dates.includes(n)) {
        numbers.push(n.trim());
      }
    }

    // 3. Dates & Months & Days
    const dateMatches = cleanText.match(/(\b(on monday|on tuesday|on wednesday|on thursday|on friday|on saturday|on sunday)\b|\bby (20\d{2}|19\d{2})\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(,\s+\d{4})?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(19\d{2}|20\d{2})\b)/gi) || [];
    for (const d of dateMatches) {
      dates.push(d.trim());
    }

    // 4. Organizations & Entities
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

    // 5. People names
    const knownPeople = [
      'suryakumar yadav', 'shreyas iyer', 'rohit sharma', 'virat kohli', 'narendra modi',
      'hardik pandya', 'jasprit bumrah', 'rahul dravid', 'gautam gambhir'
    ];
    for (const p of knownPeople) {
      if (lower.includes(p)) {
        people.push(p);
      }
    }

    // 6. Specific Monuments / Temples / Subjects
    if (/ram mandir|ram janmbhoomi|ram temple/i.test(cleanText)) {
      events.push('Ram Mandir');
    }
    if (/chandrayaan/i.test(cleanText)) {
      events.push('Chandrayaan');
    }
    if (/earth|sun|orbit/i.test(cleanText)) {
      events.push('Earth Sun Orbit');
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
   * Decomposes compound claims or multi-proposition sentences into atomic subclaims
   */
  public extractSubclaims(claimText: string): SubClaim[] {
    const clean = this.normalizeClaim(claimText);
    const subclaims: SubClaim[] = [];

    // 1. Dual-qualifier pattern: "[Base] by (both) [Attr1] and [Attr2]"
    // e.g. "Asia is the largest continent in the world by both land area and total population."
    const bothMatch = clean.match(/^(.+?)\s+by\s+(?:both\s+)?([a-zA-Z\s]+?)\s+(?:and|as well as)\s+([a-zA-Z\s]+?)[.]?$/i);
    if (bothMatch) {
      const baseStem = bothMatch[1].trim();
      const attr1 = bothMatch[2].trim();
      const attr2 = bothMatch[3].trim();

      const words = baseStem.replace(/^(the|a|an)\s+/i, '').split(/\s+/);
      const subject = words[0];

      subclaims.push({
        id: 'sub-1',
        subject,
        predicate: baseStem,
        attribute: attr1,
        text: `${baseStem} by ${attr1}.`,
      });
      subclaims.push({
        id: 'sub-2',
        subject,
        predicate: baseStem,
        attribute: attr2,
        text: `${baseStem} by ${attr2}.`,
      });
      return subclaims;
    }

    // 2. Conjoined independent clauses: "[Clause 1], but [Clause 2]" or "[Clause 1], while [Clause 2]" or "[Clause 1] and [Clause 2]"
    // e.g. "Asia is the largest continent by land area, but Europe is the largest continent by population."
    const clauseMatch = clean.match(/^(.+?)(?:,\s*but\s+|,\s*while\s+|;\s*|\s+and\s+(?=[A-Z]))(.+?)[.]?$/i);
    if (clauseMatch) {
      const c1 = clauseMatch[1].trim();
      const c2 = clauseMatch[2].trim();
      if (c1.length > 8 && c2.length > 8 && /\b(is|are|was|were|has|have|won|lost)\b/i.test(c1) && /\b(is|are|was|were|has|have|won|lost)\b/i.test(c2)) {
        subclaims.push({
          id: 'sub-1',
          subject: c1.replace(/^(the|a|an)\s+/i, '').split(/\s+/).slice(0, 2).join(' '),
          predicate: c1,
          text: c1.endsWith('.') ? c1 : `${c1}.`,
        });
        subclaims.push({
          id: 'sub-2',
          subject: c2.replace(/^(the|a|an)\s+/i, '').split(/\s+/).slice(0, 2).join(' '),
          predicate: c2,
          text: c2.endsWith('.') ? c2 : `${c2}.`,
        });
        return subclaims;
      }
    }

    return subclaims;
  }

  /**
   * Extracts Entity-Attribute-Value (EAV) triple from a factual claim
   */
  public extractClaimTriple(claimText: string): ClaimTriple | null {
    const clean = this.normalizeClaim(claimText);
    const lower = clean.toLowerCase();

    // Check for negation (e.g. "India is not located in Asia", "has never been")
    const isNegated = /\b(not|never|neither|cannot|is not|are not|was not|does not|did not|has never been)\b/i.test(clean);

    // 1. Tournament / Competition Winner assertion (e.g. "India won the 2026 FIFA World Cup", "Spain won the 2026 FIFA World Cup")
    const winnerMatch = clean.match(/^([a-zA-Z\s]+?)\s+(?:won|clinched|lifted|triumphed in|took home)\s+(?:the\s+)?(?:(\d{4})\s+)?([a-zA-Z0-9'\s-]+?(?:world cup|championship|tournament|cup|trophy|league|olympics|copa|euro))[.]?$/i);
    if (winnerMatch) {
      const winnerName = winnerMatch[1].trim();
      const year = winnerMatch[2] ? winnerMatch[2].trim() : (clean.match(/\b(20\d{2}|19\d{2})\b/)?.[0] || '');
      const tournament = winnerMatch[3].trim();
      const fullTournament = year ? `${year} ${tournament}` : tournament;

      return {
        entity: fullTournament,
        attribute: 'winner',
        holder: winnerName,
        claimValue: winnerName,
        year,
        tournament: tournament.toLowerCase(),
        temporalType: year ? (parseInt(year, 10) >= 2026 ? 'CURRENT' : 'PAST') : 'CURRENT',
        isNegated,
      };
    }

    // 2. Succession / Replacement Assertion (e.g. "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain")
    const replaceMatch = clean.match(/^([a-zA-Z\s]+?)\s+(?:replaced|replaces|took over from|succeeded)\s+([a-zA-Z\s]+?)\s+as\s+(?:the\s+)?([a-zA-Z0-9'\s-]+?)[.]?$/i);
    if (replaceMatch) {
      return {
        entity: replaceMatch[3].trim(),
        attribute: 'transition',
        holder: replaceMatch[1].trim(),
        replacedEntity: replaceMatch[2].trim(),
        claimValue: `${replaceMatch[1].trim()} replaced ${replaceMatch[2].trim()}`,
        role: replaceMatch[3].trim(),
        temporalType: 'CURRENT',
        isNegated,
      };
    }

    // 2. Role / Captaincy / Leadership / Office Assertion (e.g. "Now T20 captain of India is Suryakumar Yadav", "Suryakumar Yadav is currently India's T20I captain", "John is the CEO")
    // 2a. "Now/Currently [Role] of [Entity] is [Holder]" or "Now [Role] is [Holder]"
    const rolePrefixMatch = clean.match(/^(?:now\s+|currently\s+)?(?:the\s+)?(?:current\s+)?([a-zA-Z0-9'\s-]+?\s+(?:captain|ceo|president|prime minister|chief minister|coach|manager|head|director|leader))\s+(?:of\s+([a-zA-Z0-9'\s-]+?)\s+)?is\s+([a-zA-Z\s]+?)[.]?$/i);
    if (rolePrefixMatch) {
      const roleName = rolePrefixMatch[1].trim();
      const entityContext = rolePrefixMatch[2] ? rolePrefixMatch[2].trim() : '';
      const holderName = rolePrefixMatch[3].trim();
      const isPast = /\b(was|formerly|previously|earlier)\b/i.test(clean);
      const isNever = /\b(never|has never)\b/i.test(clean);

      return {
        entity: entityContext ? `${entityContext} ${roleName}` : roleName,
        attribute: 'role_holder',
        role: roleName.toLowerCase(),
        holder: holderName,
        claimValue: holderName,
        temporalType: isNever ? 'NEVER' : isPast ? 'PAST' : 'CURRENT',
        isNegated,
      };
    }

    // 2b. "[Holder] (is|was|has never been) currently/now [Role/Possessive]"
    // e.g. "Shreyas Iyer is currently India's T20I captain", "Suryakumar Yadav was India's T20I captain earlier in 2026", "Suryakumar Yadav has never been India's T20I captain"
    const holderPrefixMatch = clean.match(/^([a-zA-Z\s]+?)\s+(is|was|has never been)\s+(?:currently\s+|now\s+|the current\s+)?(?:the\s+)?([a-zA-Z0-9'\s-]+?\s+(?:captain|ceo|president|prime minister|chief minister|coach|manager))(?:\s+of\s+([a-zA-Z0-9'\s-]+))?(?:\s+(?:earlier\s+in\s+\d{4}|earlier|previously|formerly|in\s+\d{4}))?[.]?$/i);
    if (holderPrefixMatch) {
      const holderName = holderPrefixMatch[1].trim();
      const roleName = holderPrefixMatch[3].trim();
      const entityContext = holderPrefixMatch[4] ? holderPrefixMatch[4].trim() : '';
      const isPast = holderPrefixMatch[2].toLowerCase() === 'was' || /\b(earlier|previously|formerly)\b/i.test(clean);
      const isNever = holderPrefixMatch[2].toLowerCase().includes('never');

      return {
        entity: entityContext ? `${entityContext} ${roleName}` : roleName,
        attribute: 'role_holder',
        role: roleName.toLowerCase(),
        holder: holderName,
        claimValue: holderName,
        temporalType: isNever ? 'NEVER' : isPast ? 'PAST' : 'CURRENT',
        isNegated,
      };
    }

    // 3. Capital assertion: e.g. "Paris is the capital of Germany", "The capital of India is Mumbai", "India's capital city is New Delhi"
    const cityFirstCapMatch = clean.match(/^([a-zA-Z\s]+?)\s+(?:is|serves as)\s+(?:the\s+)?capital(?: city)?\s+of\s+(?:the\s+)?([a-zA-Z\s]+?)[.]?$/i);
    if (cityFirstCapMatch) {
      const capVal = cityFirstCapMatch[1].trim().toLowerCase().replace(/^(the|a|an)\s+/i, '');
      const rawEntity = cityFirstCapMatch[2].trim();
      return {
        entity: rawEntity,
        attribute: 'capital',
        claimValue: capVal,
        isNegated,
      };
    }

    const capMatch = clean.match(/(?:capital(?: city)? of\s+([a-zA-Z\s]+?)\s+is|([a-zA-Z\s]+?)(?:'s|\s+)\s*capital(?: city)?\s+is)\s+([a-zA-Z\s]+?)[.]?$/i);
    if (capMatch) {
      const rawEntity = (capMatch[1] || capMatch[2] || 'India').trim();
      const capVal = capMatch[3].trim().toLowerCase().replace(/[.]+$/, '').replace(/^(the|a|an)\s+/i, '');
      return {
        entity: rawEntity,
        attribute: 'capital',
        claimValue: capVal,
        isNegated,
      };
    }

    // 3b. Shape & Geometric Form assertion (Requirement 3, 4, 7): e.g. "The Earth is flat", "The Earth is round", "The Earth is spherical", "The Earth is an oblate spheroid"
    const shapeMatch = clean.match(/^(?:the\s+)?([a-zA-Z\s]+?)\s+(?:is|has|is shaped like|has the shape of)\s+(?:a\s+|an\s+)?(flat|round|spherical|sphere|oblate spheroid|ellipsoid|geoid|disc|disc-shaped|cube|cubical|cylinder|cylindrical|pyramid|pyramidal|donut-shaped|torus)[.]?$/i);
    if (shapeMatch) {
      const subject = shapeMatch[1].trim().replace(/^(the|a|an)\s+/i, '');
      const shapeVal = shapeMatch[2].trim().toLowerCase();
      return {
        entity: subject,
        attribute: 'shape',
        holder: subject,
        claimValue: shapeVal,
        property: 'shape',
        isNegated,
      };
    }

    // 4. Location assertion: e.g. "Ram Mandir is in Pakistan", "India is in South America", "India is a sovereign country located in South Asia"
    const locMatch = clean.match(/^(.+?)\s+(?:is not located in|is not in|is located in|is in|are located in|are in|is a country in|is a sovereign country located in|lies in|situated in)\s+(.+?)[.]?$/i);
    if (locMatch && locMatch[1] && locMatch[2]) {
      let rawEntity = locMatch[1].trim().replace(/\b(is|are|was|were)?\s*not\b/i, '').trim();
      rawEntity = rawEntity.replace(/\b(is|are)\s+(?:a\s+)?(?:sovereign\s+)?(?:country|nation|state|territory|island)\b/i, '').trim();
      const rawLoc = locMatch[2].trim().toLowerCase().replace(/[.]+$/, '');
      const entity = /ram mandir|ram temple|ram janmbhoomi/i.test(rawEntity) ? 'Ram Mandir' : rawEntity;
      return {
        entity,
        attribute: 'location',
        claimValue: rawLoc,
        isNegated,
      };
    }

    // 5. Composition / Material assertion (e.g. "The Moon is made entirely of cheese", "The Moon is a rocky body")
    const compMatMatch = clean.match(/^(?:the\s+)?([a-zA-Z\s]+?)\s+(?:is|are)\s+(?:made|composed|consists|formed)(?:\s+(?:entirely|mostly|primarily|partially|predominantly))?\s+of\s+([a-zA-Z0-9'\s-]+?)[.]?$/i);
    if (compMatMatch) {
      const rawSubject = compMatMatch[1].trim();
      const subject = rawSubject.replace(/^(the|a|an)\s+/i, '');
      const material = compMatMatch[2].trim().toLowerCase();
      return {
        entity: subject,
        attribute: 'composition',
        holder: subject,
        claimValue: material,
        property: 'composition',
        isNegated,
      };
    }
    const rockyMatch = clean.match(/^(?:the\s+)?([a-zA-Z\s]+?)\s+(?:is|are)\s+(?:a\s+)?(rocky\s+body|rocky\s+planetary\s+body|gaseous\s+planet|gas\s+giant|terrestrial\s+planet|rocky\s+material)[.]?$/i);
    if (rockyMatch) {
      const rawSubject = rockyMatch[1].trim();
      const subject = rawSubject.replace(/^(the|a|an)\s+/i, '');
      return {
        entity: subject,
        attribute: 'composition',
        holder: subject,
        claimValue: rockyMatch[2].trim().toLowerCase(),
        property: 'composition',
        isNegated,
      };
    }

    // 6. Superlative & Category Ranking (e.g. "The Earth is the largest planet in the Solar System", "Asia is the largest continent in world", "The Pacific Ocean is the smallest ocean")
    const superMatch = clean.match(/^(?:the\s+)?([a-zA-Z\s]+?)\s+(?:is|are)\s+(?:the\s+)?(largest|biggest|smallest|highest|lowest|tallest|deepest|longest|fastest|coldest|hottest|oldest|youngest|most populous|first|last|most|least)\s+([a-zA-Z0-9'\s-]+?)(?:\s+(?:in|of)\s+(?:the\s+)?([a-zA-Z0-9'\s-]+))?(?:\s+by\s+(?:both\s+)?([a-zA-Z0-9'\s-]+))?[.]?$/i);
    if (superMatch) {
      const rawSubject = superMatch[1].trim();
      const subject = rawSubject.replace(/^(the|a|an)\s+/i, '');
      const superType = superMatch[2].trim().toLowerCase();
      const category = superMatch[3].trim().toLowerCase();
      const scope = superMatch[4] ? superMatch[4].trim() : '';
      const byAttr = superMatch[5] ? superMatch[5].trim() : '';
      const fullCategory = scope ? `${category} in the ${scope}` : category;

      return {
        entity: fullCategory,
        attribute: 'superlative',
        holder: subject,
        claimValue: byAttr ? `${superType} ${fullCategory} by ${byAttr}` : `${superType} ${fullCategory}`,
        superlativeType: superType,
        category,
        scope,
        property: byAttr || undefined,
        isNegated,
      };
    }

    // 7. Astronomical / Physical Comparison: e.g. "The Earth is larger than the Sun"
    const compMatch = clean.match(/(?:the\s+)?([a-zA-Z\s]+?)\s+is\s+(larger than|smaller than|bigger than|hotter than|colder than|brighter than)\s+(?:the\s+)?([a-zA-Z\s]+?)[.]?$/i);
    if (compMatch) {
      return {
        entity: compMatch[1].trim(),
        attribute: 'comparison',
        claimValue: `${compMatch[2].trim()} ${compMatch[3].trim().toLowerCase()}`,
        isNegated,
      };
    }

    // 8. Astronomical / Orbital Motion: e.g. "The Earth orbits the Sun"
    if (/\b(orbits the sun|revolves around the sun|rotates around the sun|orbits sun)\b/i.test(lower)) {
      return {
        entity: 'Earth',
        attribute: 'scientific',
        claimValue: 'orbits the sun',
        isNegated,
      };
    }

    // 9. Physical Constants & Boiling/Melting: e.g. "Water boils at 20°C at standard atmospheric pressure", "Water freezes at 0°C"
    const boilMatch = clean.match(/^(?:the\s+)?([a-zA-Z\s]+?)\s+(boils|freezes|melts)\s+at\s+(?:approximately|around|about)?\s*(-?\d+(?:\.\d+)?)\s*(?:°\s*c|degrees celsius|°\s*f|degrees fahrenheit|k|kelvin)?(?:\s+at\s+([a-zA-Z0-9'\s-]+))?[.]?$/i);
    if (boilMatch) {
      const rawSubject = boilMatch[1].trim().replace(/^(the|a|an)\s+/i, '');
      const action = boilMatch[2].toLowerCase();
      const temp = parseFloat(boilMatch[3]);
      const pressure = boilMatch[4] ? boilMatch[4].trim() : 'standard atmospheric pressure';
      return {
        entity: `${rawSubject} ${action} point`,
        attribute: 'scientific',
        holder: rawSubject,
        property: `${action} point`,
        numericVal: temp,
        claimValue: `${temp}°C`,
        unit: '°c',
        scope: pressure,
        isNegated,
      };
    }

    if (/\b(water freezes|freezing point of water|boiling point of water)\b/i.test(lower)) {
      const val = lower.includes('0') ? '0 degrees celsius' : lower.includes('100') ? '100 degrees celsius' : 'freezing point';
      return {
        entity: 'Water',
        attribute: 'scientific',
        claimValue: val,
        isNegated,
      };
    }

    // 10. Numerical / Quantitative assertion: e.g. "India has a population of approximately 1.4 billion", "Mount Everest is approximately 8,849 meters high"
    const numMatch = clean.match(/(?:cost|population of|population is|has a population of|height of|is approximately|elevation of|create|worth)\s+(?:approximately|around|about)?\s*(₹?\s*\d+([,.]\d+)*\s*(?:crore|lakh|billion|million|trillion|percent|%|meters|metres|jobs)?)/i);
    if (numMatch && numMatch[1]) {
      const numStr = numMatch[1].replace(/,/g, '').trim();
      const numVal = parseFloat(numStr.replace(/[^\d.]/g, ''));
      return {
        entity: clean.split(' ')[0],
        attribute: 'numerical',
        claimValue: numMatch[1].trim(),
        numericVal: isNaN(numVal) ? undefined : numVal,
        unit: numStr.replace(/[\d.₹$\s]/g, '').toLowerCase(),
        isNegated,
      };
    }

    // 11. Date / Temporal assertion: e.g. "Event happened on January 10", "Construction began on Monday", "completed by 2028"
    const dateMatch = clean.match(/(?:happened on|occurred on|held on|began on|completed by|inaugurated on)\s+([a-zA-Z0-9,\s]+?)[.]?$/i);
    if (dateMatch && dateMatch[1]) {
      return {
        entity: clean.split(' ')[0],
        attribute: 'temporal',
        claimValue: dateMatch[1].trim(),
        isNegated,
      };
    }

    // 12. Superlative fallback: e.g. "Asia is largest continent"
    if (/\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\b/i.test(lower)) {
      const superlative = lower.match(/\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\s*(?:continent|country|ocean|mountain|river|city)?/i);
      const rawSubject = lower.includes('asia') ? 'Asia' : lower.includes('earth') ? 'Earth' : lower.includes('jupiter') ? 'Jupiter' : clean.split(' ')[0];
      return {
        entity: superlative ? superlative[0].trim() : 'superlative',
        attribute: 'superlative',
        holder: rawSubject.replace(/^(the|a|an)\s+/i, ''),
        claimValue: superlative ? superlative[0].trim() : 'superlative',
        superlativeType: (superlative ? superlative[0].split(' ')[0] : 'largest').toLowerCase(),
        category: superlative ? superlative[0].split(' ')[1] || 'entity' : 'entity',
        isNegated,
      };
    }

    // 13. Ruling party assertion: e.g. "BJP is ruler party of India"
    if (/ruler party|ruling party|in power|holds power/i.test(lower)) {
      return {
        entity: lower.includes('bjp') ? 'BJP' : clean.split(' ')[0],
        attribute: 'ruling_party',
        claimValue: 'ruling party',
        isNegated,
      };
    }

    return null;
  }

  /**
   * Checks numerical compatibility allowing reasonable tolerance (+/- 10%) for approximations
   */
  public checkNumericalCompatibility(claimValStr: string, evidenceText: string): 'SUPPORTIVE' | 'CONTRADICTORY' | 'UNRELATED' {
    const cleanClaim = claimValStr.toLowerCase().replace(/,/g, '');
    const cleanEv = evidenceText.toLowerCase().replace(/,/g, '');

    const cMatches = cleanClaim.match(/\d+(\.\d+)?/g);
    if (!cMatches || cMatches.length === 0) return 'UNRELATED';
    const cNum = parseFloat(cMatches[0]);

    // Check specific unit/scale matching: e.g. 1.4 billion vs 1.428 billion or 8,849 meters vs 8,848.86 meters
    const evNumMatches = cleanEv.match(/(\d+(\.\d+)?)\s*(crore|lakh|billion|million|trillion|meters|metres|jobs|percent|%)/g);
    if (evNumMatches && evNumMatches.length > 0) {
      for (const evMatch of evNumMatches) {
        const evParts = evMatch.split(/\s+/);
        const evVal = parseFloat(evParts[0]);
        if (!isNaN(evVal) && !isNaN(cNum)) {
          const diffRatio = Math.abs(evVal - cNum) / Math.max(evVal, cNum);
          if (diffRatio < 0.10) {
            return 'SUPPORTIVE';
          }
          if (diffRatio > 0.20) {
            return 'CONTRADICTORY';
          }
        }
      }
    }

    return 'UNRELATED';
  }

  /**
   * Checks date conflict between claim date assertion and evidence text
   */
  public checkDateCompatibility(claimDateStr: string, evidenceText: string): 'SUPPORTIVE' | 'CONTRADICTORY' | 'UNRELATED' {
    const cDate = claimDateStr.toLowerCase().trim();
    const cleanEv = evidenceText.toLowerCase();

    const monthDayPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i;
    const cMatch = cDate.match(monthDayPattern);

    if (cMatch) {
      const cMonth = cMatch[1].toLowerCase();
      const cDay = parseInt(cMatch[2], 10);

      const evMatch = cleanEv.match(monthDayPattern);
      if (evMatch) {
        const evMonth = evMatch[1].toLowerCase();
        const evDay = parseInt(evMatch[2], 10);

        if (cMonth === evMonth) {
          if (cDay === evDay) {
            return 'SUPPORTIVE';
          } else {
            return 'CONTRADICTORY';
          }
        }
      }
    }

    return 'UNRELATED';
  }

  /**
   * Resolves whether two locations are compatible, hierarchical, or mutually exclusive
   */
  public checkLocationCompatibility(claimLoc: string, evidenceLoc: string): 'SUPPORTIVE' | 'CONTRADICTORY' | 'UNRELATED' {
    const cLoc = claimLoc.toLowerCase().trim();
    const eLoc = evidenceLoc.toLowerCase().trim();

    if (cLoc === eLoc) return 'SUPPORTIVE';

    const eParents = LOCATION_HIERARCHY[eLoc] || [];
    const cParents = LOCATION_HIERARCHY[cLoc] || [];

    if (eParents.includes(cLoc)) {
      return 'SUPPORTIVE';
    }

    if (cParents.includes(eLoc)) {
      return 'SUPPORTIVE';
    }

    const isCContinent = KNOWN_CONTINENTS.has(cLoc);
    const isEContinent = KNOWN_CONTINENTS.has(eLoc);
    if (isCContinent && isEContinent && cLoc !== eLoc) {
      return 'CONTRADICTORY';
    }

    if (isCContinent && !cParents.includes(cLoc) && (eParents.includes('asia') || eLoc === 'asia' || eLoc === 'south asia')) {
      return 'CONTRADICTORY';
    }

    const isCCountry = KNOWN_COUNTRIES.has(cLoc);
    const isECountry = KNOWN_COUNTRIES.has(eLoc);
    const eCountry = eParents.find((p) => KNOWN_COUNTRIES.has(p));

    if (isCCountry && isECountry && cLoc !== eLoc) {
      return 'CONTRADICTORY';
    }

    if (isCCountry && eCountry && cLoc !== eCountry) {
      return 'CONTRADICTORY';
    }

    if (LOCATION_HIERARCHY[cLoc] && LOCATION_HIERARCHY[eLoc] && !eParents.includes(cLoc) && !cParents.includes(eLoc)) {
      return 'CONTRADICTORY';
    }

    return 'UNRELATED';
  }
}

export const entityExtractorService = new EntityExtractorService();
export default entityExtractorService;
