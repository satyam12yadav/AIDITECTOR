export interface SourceTierDefinition {
  tier: 1 | 2 | 3 | 4 | 5;
  label: string;
  badge: string;
  baseWeight: number; // 0.0 to 1.0 (equivalent to 0 - 100 points)
  description: string;
}

export const SOURCE_TIER_CONFIG: Record<1 | 2 | 3 | 4 | 5, SourceTierDefinition> = {
  1: {
    tier: 1,
    label: 'Official Government / Institutional Authority',
    badge: 'Tier 1: Official Authority',
    baseWeight: 0.98,
    description:
      'Official statutory bodies, central banks, supreme courts, election commissions, and verified state fact-checking units (e.g., PIB Fact Check, RBI, WHO, UN).',
  },
  2: {
    tier: 2,
    label: 'Established Fact-Checking Organization',
    badge: 'Tier 2: IFCN Fact-Checker',
    baseWeight: 0.92,
    description:
      'IFCN-certified and independent forensic fact-checking organizations (e.g., BOOM Live, Alt News, Vishvas News, Factly, Newschecker, India Today Fact Check).',
  },
  3: {
    tier: 3,
    label: 'Major Wire Service / National Legacy Broadsheet',
    badge: 'Tier 3: Major News Organization',
    baseWeight: 0.85,
    description:
      'Primary wire services and established high-circulation broadsheets (e.g., Reuters, AP, PTI, ANI, The Hindu, The Indian Express, Hindustan Times, NDTV).',
  },
  4: {
    tier: 4,
    label: 'Established Media & Analytical Publications',
    badge: 'Tier 4: Regional / Analytical Media',
    baseWeight: 0.78,
    description:
      'Regional broadsheets, financial media, independent digital platforms, and analytical magazines (e.g., LiveMint, Deccan Herald, Dainik Bhaskar, Scroll.in, The Wire, Caravan).',
  },
  5: {
    tier: 5,
    label: 'Unverified Web / Low-Authority Source',
    badge: 'Tier 5: Unverified Web Source',
    baseWeight: 0.50,
    description:
      'Unclassified blogs, social media posts, unregistered websites, and personal opinion forums.',
  },
};
