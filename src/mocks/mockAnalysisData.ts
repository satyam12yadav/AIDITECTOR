import { AnalysisResult, ErrorDetails, LoadingStep } from '../types/analysis';

export const initialLoadingSteps: LoadingStep[] = [
  {
    id: 1,
    title: 'Extracting Article',
    description: 'Data successfully parsed and structured.',
    status: 'completed',
  },
  {
    id: 2,
    title: 'Identifying Claims',
    description: '32 distinct verifiable claims extracted.',
    status: 'completed',
  },
  {
    id: 3,
    title: 'Checking Evidence',
    description: 'Cross-referencing claims against trusted institutional databases...',
    status: 'active',
  },
  {
    id: 4,
    title: 'Analyzing Sources',
    description: 'Pending evaluation of source credibility.',
    status: 'pending',
  },
  {
    id: 5,
    title: 'Calculating Credibility',
    description: 'Final synthesis and scoring pending.',
    status: 'pending',
  },
];

export const mockResultCredible: AnalysisResult = {
  id: 'ID-7392-X',
  title: 'Fiscal Policy Shifts & Projected Economic Impact on Middle Income Households',
  sourceUrl: 'https://financial-forensics.org/reports/2024/fiscal-projections-middle-class.html',
  publisher: 'Institutional Economic Review',
  author: 'Marcus Vance & Elena Rostova',
  analyzedAt: '2024-10-27 14:03 UTC',
  credibilityScore: 78,
  confidenceLevel: 84,
  verdict: 'PROBABLY_CREDIBLE',
  verdictLabel: 'PROBABLY CREDIBLE',
  wordCount: 1420,
  totalClaimsIdentified: 32,
  executiveSummary: [
    'The analyzed publication demonstrates strong alignment with authenticated primary financial data, exhibiting a high degree of corroboration across independent statistical sources.',
    'While the core thesis regarding macroeconomic supply chains and localized shipping tariffs is verified, certain peripheral claims regarding sweeping tax bracket expansions were found to be contradicted by official statutory amendments (Section 12-B).',
    'Overall, the article maintains solid factual integrity with minor rhetorical amplification.',
  ],
  diagnostics: {
    evidenceSupport: 82,
    sourceReliability: 71,
    crossSourceAgreement: 88,
    claimVerification: 75,
    articleQuality: 74,
  },
  sourceProfile: {
    name: 'Logistics & Economic Quarterly',
    domain: 'economic-quarterly.org',
    reputationLevel: 'Institutional',
    score: 82,
    description: 'Peer-reviewed trade journalism with transparent editorial peer reviews and verified citation registries.',
    biasRating: 'Minimal / Centrist',
  },
  claims: [
    {
      id: 'claim-1',
      claimId: 'CL-4921-A',
      statement: 'The proposed law will increase taxes by 40% for the middle class.',
      status: 'contradicted',
      statusLabel: 'Contradicted',
      flagReason: 'Contradicted by primary statutory records and economic reviews.',
      evidence: [
        {
          id: 'ev-1',
          sourceName: 'Associated Press',
          reliabilityBadge: 'Highly Reliable',
          reliabilityTier: 'high',
          quote: 'Financial analysts confirm the maximum tax increase is capped at 4% under the revised stipulations of Section 12-B...',
          url: 'https://apnews.com',
          isAvailable: true,
        },
        {
          id: 'ev-2',
          sourceName: 'Congressional Budget Office',
          reliabilityBadge: 'Primary Source',
          reliabilityTier: 'high',
          quote: 'Projections indicate a negligible median increase of 3.8% for households within the targeted income bracket.',
          url: 'https://cbo.gov',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'claim-2',
      claimId: 'CL-4922-B',
      statement: 'Global supply chain disruptions have increased localized shipping costs by 18% year-over-year.',
      status: 'supported',
      statusLabel: 'Supported',
      evidence: [
        {
          id: 'ev-3',
          sourceName: 'Logistics Quarterly Review',
          reliabilityBadge: 'Industry Standard',
          reliabilityTier: 'high',
          quote: 'Data aggregated from major North American ports demonstrates an exact 18.2% spike in localized final-mile delivery tariffs.',
          url: 'https://logisticsquarterly.com',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'claim-3',
      claimId: 'CL-4923-C',
      statement: 'A new internal memo shows corporate executives knew about structural flaws since 2018.',
      status: 'unverified',
      statusLabel: 'Unverified',
      flagReason: 'Originates from unverified anonymous social media leaks without forensic corroboration.',
      evidence: [
        {
          id: 'ev-4',
          sourceName: 'Anonymous Leaker (via Social Media)',
          reliabilityBadge: 'Low Reliability',
          reliabilityTier: 'low',
          quote: 'I have seen the emails myself, they knew in 2018.',
          url: '#',
          note: 'Note: Unable to authenticate documents referenced in social media post. Institutional confirmation pending.',
          isAvailable: false,
        },
      ],
    },
  ],
};

export const mockResultSensationalized: AnalysisResult = {
  id: 'FNK-2024-893A',
  title: 'New Study Claims Daily Coffee Consumption Reverses Aging Process in Adults Over 50',
  sourceUrl: 'https://healthwellnessdaily.co/news/coffee-reverses-aging-2024',
  publisher: 'Health & Wellness Daily',
  author: 'Dr. S. Jenkins (Unverified)',
  analyzedAt: '2024-10-27 14:32 UTC',
  credibilityScore: 64,
  confidenceLevel: 79,
  verdict: 'UNVERIFIED',
  verdictLabel: 'SENSATIONALIZED / MARGINAL',
  wordCount: 890,
  totalClaimsIdentified: 18,
  executiveSummary: [
    'The article presents a heavily sensationalized interpretation of a legitimate but limited observational study. While foundational research exists, the author drastically exaggerates the findings, equating "reduced oxidative stress markers" with "reversing the aging process."',
    'Key issues identified include the misrepresentation of causal relationships, reliance on a single unverified expert quote, and failure to mention the study\'s small sample size (n=45). The overall tone is engineered for viral engagement rather than scientific veracity.',
  ],
  diagnostics: {
    evidenceSupport: 52,
    sourceReliability: 45,
    crossSourceAgreement: 58,
    claimVerification: 61,
    articleQuality: 48,
  },
  sourceProfile: {
    name: 'Health & Wellness Daily',
    domain: 'healthwellnessdaily.co',
    reputationLevel: 'Marginal',
    score: 45,
    description: 'Ad-driven lifestyle blog frequently publishing hyperbolic health claims without medical peer review.',
    biasRating: 'Sensationalist / Clickbait Bias',
  },
  claims: [
    {
      id: 'claim-s1',
      claimId: 'CL-8801-A',
      statement: 'Drinking 3 cups of dark roast daily actively reverses the cellular aging process.',
      status: 'contradicted',
      statusLabel: 'False Equivalence',
      flagReason: 'Hyperbolic assertion conflating antioxidant markers with biological age reversal.',
      evidence: [
        {
          id: 'ev-s1',
          sourceName: 'Journal of Gerontological Science',
          reliabilityBadge: 'Peer Reviewed',
          reliabilityTier: 'high',
          quote: 'The study observed slight cellular resilience biomarkers in mice, but provides no clinical evidence of biological age reversal in humans.',
          url: 'https://gerontology-journal.org',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'claim-s2',
      claimId: 'CL-8802-B',
      statement: 'Coffee contains natural polyphenol antioxidants.',
      status: 'supported',
      statusLabel: 'Verified Fact',
      evidence: [
        {
          id: 'ev-s2',
          sourceName: 'National Institutes of Health',
          reliabilityBadge: 'Primary Source',
          reliabilityTier: 'high',
          quote: 'Coffee beans are rich in chlorogenic acids and diverse polyphenol antioxidants known to neutralize free radicals.',
          url: 'https://nih.gov',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'claim-s3',
      claimId: 'CL-8803-C',
      statement: 'The clinical trial demonstrated a 100% success rate across all participant demographics.',
      status: 'unverified',
      statusLabel: 'Misrepresented Sample',
      flagReason: 'The cited observational cohort consisted of only 45 self-reporting volunteers.',
      evidence: [
        {
          id: 'ev-s3',
          sourceName: 'Medical Research Registry',
          reliabilityBadge: 'Registry Record',
          reliabilityTier: 'medium',
          quote: 'Pilot study n=45; non-randomized self-selected cohort without placebo control.',
          url: 'https://clinicaltrials.gov',
          isAvailable: true,
        },
      ],
    },
  ],
};

export const mockResultDebunked: AnalysisResult = {
  id: 'FNK-2024-991D',
  title: 'BREAKING: Global Central Bank Quietly Implements Mandatory Microchip Currency Mandate',
  sourceUrl: 'https://globaltruthbulletin.net/wire/2024/chip-mandate-leak',
  publisher: 'Global Truth Bulletin',
  author: 'Anonymous Correspondent',
  analyzedAt: '2024-10-27 15:10 UTC',
  credibilityScore: 24,
  confidenceLevel: 96,
  verdict: 'HIGHLY_SUSPICIOUS',
  verdictLabel: 'HIGHLY SUSPICIOUS / FABRICATED',
  wordCount: 650,
  totalClaimsIdentified: 14,
  executiveSummary: [
    'Critical failure across all forensic authenticity benchmarks. The submitted text contains fabricated institutional declarations and misquotes international financial regulatory documents.',
    'Forensic linguistic diagnostics detect high emotional manipulation markers, coordinated viral phrasing patterns, and zero corroborating records from any recognized banking regulatory body.',
  ],
  diagnostics: {
    evidenceSupport: 12,
    sourceReliability: 18,
    crossSourceAgreement: 8,
    claimVerification: 15,
    articleQuality: 22,
  },
  sourceProfile: {
    name: 'Global Truth Bulletin',
    domain: 'globaltruthbulletin.net',
    reputationLevel: 'Low Trust',
    score: 18,
    description: 'Domain flagged repeatedly for disseminating unsubstantiated conspiracy narratives and synthetic content.',
    biasRating: 'Extreme Conspiracy / Fabricated Evidence',
  },
  claims: [
    {
      id: 'claim-d1',
      claimId: 'CL-9901-X',
      statement: 'An international mandate takes effect next month requiring biometric chips for banking access.',
      status: 'contradicted',
      statusLabel: 'Fabricated',
      flagReason: 'Total lack of statutory basis; directly contradicted by Bank for International Settlements disclosures.',
      evidence: [
        {
          id: 'ev-d1',
          sourceName: 'Bank for International Settlements (BIS)',
          reliabilityBadge: 'Official Regulatory Source',
          reliabilityTier: 'high',
          quote: 'No such mandate exists. Central bank digital currency explorations remain sovereign, voluntary, and standard electronic account based.',
          url: 'https://bis.org',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'claim-d2',
      claimId: 'CL-9902-Y',
      statement: 'Leaked executive order confirmed by unnamed high-ranking official.',
      status: 'unverified',
      statusLabel: 'Fabricated Citation',
      flagReason: 'The referenced executive order number does not correspond to any valid government decree.',
      evidence: [
        {
          id: 'ev-d2',
          sourceName: 'Federal Register Public Archive',
          reliabilityBadge: 'Government Repository',
          reliabilityTier: 'high',
          quote: 'Query returned zero matches for document identifier cited in publication.',
          url: 'https://federalregister.gov',
          isAvailable: true,
        },
      ],
    },
  ],
};

export const mockErrorDetails: ErrorDetails = {
  title: 'Article Not Found',
  message: "We couldn't reach this URL. Please check the address or try pasting the article text directly for analysis.",
  errorCode: 'HTTP_404_UNREACHABLE',
  targetInput: 'https://unreachable-source-domain.org/articles/lost-page-771',
  diagnosticLog: `[SYS_ERR] HTTP 404: Target host unreachable or DNS resolution failure.
[TRACE] Node 0x7F_9A network timeout after 15000ms.
[TIMESTAMP] 2024-10-27T14:32:01.442Z
[ACTION_RECOMMENDED] Recommend manual text ingestion or verification of canonical URL scheme.
[STATUS] Verification halted safely. No incomplete score computed.`,
};

export const sampleArticlePresets = [
  {
    name: '1. Credible Geography',
    url: 'https://britannica.com/place/Asia-geography-overview',
    text: `Asia is the largest continent in the world by both land area and total population. India is a sovereign country located in South Asia.`,
    targetMock: mockResultCredible,
  },
  {
    name: '2. Contradicted Claim',
    url: 'https://factcheck-archive.org/reports/ram-mandir-geography-claim',
    text: `Ram Mandir is located in Pakistan and was constructed in Islamabad.`,
    targetMock: mockResultDebunked,
  },
  {
    name: '3. Mixed True / False',
    url: 'https://science-digest.org/articles/astronomy-and-geography-primer',
    text: `India is a sovereign country located in Asia. The Earth is the largest planet in the Solar System.`,
    targetMock: mockResultSensationalized,
  },
  {
    name: '4. Current-Event Temporal',
    url: 'https://cricket-wire.org/news/2026/india-t20-captaincy-roster',
    text: `Now T20 captain of India is Suryakumar Yadav.`,
    targetMock: mockResultDebunked,
  },
  {
    name: '5. Unverified / Obscure',
    url: 'https://local-gazette.org/village-population-survey',
    text: `A newly discovered village named Xyzoria has exactly 417 residents.`,
    targetMock: mockResultCredible,
  },
];
