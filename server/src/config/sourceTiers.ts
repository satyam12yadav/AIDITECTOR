export interface SourceTierDefinition {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  badge: string;
  baseWeight: number; // 0.0 to 1.0 (equivalent to 0 - 100 points)
  reliabilityRange: [number, number]; // [min, max]
  description: string;
}

export const SOURCE_TIER_CONFIG: Record<1 | 2 | 3 | 4 | 5, SourceTierDefinition> = {
  1: {
    tier: 1,
    label: 'Official / Primary Authority',
    badge: 'Tier 1: Official Authority',
    baseWeight: 0.98,
    reliabilityRange: [90, 100],
    description:
      'Official government portals, statutory bodies, sports boards (BCCI, ICC), central banks (RBI), election commissions, and verified institutional authorities.',
  },
  2: {
    tier: 2,
    label: 'Highly Reliable Independent News & Wire Services',
    badge: 'Tier 2: Primary News / Wire Service',
    baseWeight: 0.90,
    reliabilityRange: [80, 95],
    description:
      'Primary international wire services and high-credibility national broadsheets (Reuters, AP, AFP, PTI, The Hindu, The Indian Express, BBC, NYT).',
  },
  3: {
    tier: 3,
    label: 'Recognized Fact-Checking Organization',
    badge: 'Tier 3: Verified Fact-Checker',
    baseWeight: 0.88,
    reliabilityRange: [75, 95],
    description:
      'IFCN-signatory forensic fact-checking organizations (BOOM Live, Alt News, PIB Fact Check, Snopes, AFP Fact Check, Factly, Newschecker).',
  },
  4: {
    tier: 4,
    label: 'General Publishers & Reference Repositories',
    badge: 'Tier 4: General Publisher',
    baseWeight: 0.70,
    reliabilityRange: [50, 80],
    description:
      'General digital publishers, regional portals, encyclopedias, and established knowledge archives (Encyclopædia Britannica, National Geographic, Wikipedia).',
  },
  5: {
    tier: 5,
    label: 'Unknown / Low Trust Sources',
    badge: 'Tier 5: Unknown / Low Trust',
    baseWeight: 0.35,
    reliabilityRange: [20, 50],
    description:
      'Unclassified blogs, scraped websites, unattributed pages, social feeds, and low-quality content aggregators.',
  },
};
