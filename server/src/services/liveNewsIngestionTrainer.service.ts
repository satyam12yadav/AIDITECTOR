import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { embeddingService } from './embeddingService.js';
import { DatasetVectorIndex, DatasetVectorItem } from './datasetSimilarity.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VerifiedNewsPair {
  id: string;
  category: 'RUSSIA_UKRAINE' | 'GEN_Z_PROTESTS' | 'RAM_MANDIR' | 'GOVERNMENT_POLICIES' | 'SPORTS';
  realFact: {
    title: string;
    text: string;
    sources: string[];
  };
  fakeRumor: {
    title: string;
    text: string;
    debunkProof: string;
  };
}

/**
 * Curated live multi-newspaper benchmark corpus covering the 5 key focus areas
 */
export const MULTI_SOURCE_TRAINING_CORPUS: VerifiedNewsPair[] = [
  // 1. RUSSIA & UKRAINE CONFLICT
  {
    id: 'ru-ukr-001',
    category: 'RUSSIA_UKRAINE',
    realFact: {
      title: "Russia-Ukraine war remains an active ongoing military conflict along the eastern frontline.",
      text: "As confirmed by Reuters, AP News, and the Institute for the Study of War (ISW), the Russia-Ukraine armed conflict is ongoing with active combat operations in the Donbas, Kharkiv, and southern sectors without a comprehensive ceasefire.",
      sources: ['Reuters', 'Associated Press', 'BBC News', 'ISW']
    },
    fakeRumor: {
      title: "Russia and Ukraine signed a permanent peace agreement ending all war hostilities.",
      text: "Viral social media posts claimed that a permanent peace treaty was signed in Geneva officially ending all hostilities between Russia and Ukraine.",
      debunkProof: "Debunked: No permanent peace treaty or ceasefire has been ratified; diplomatic negotiations remain stalled."
    }
  },
  {
    id: 'ru-ukr-002',
    category: 'RUSSIA_UKRAINE',
    realFact: {
      title: "Russian military forces maintain operational control over Crimea and parts of eastern Ukraine.",
      text: "Official military updates and satellite reconnaissance confirm Russian armed forces maintain territorial control over the Crimean peninsula, Luhansk, Donetsk, and portions of Zaporizhzhia and Kherson oblasts.",
      sources: ['Reuters', 'BBC News', 'UN Security Council']
    },
    fakeRumor: {
      title: "Russia completed a full military withdrawal of all armed forces from Ukrainian territory.",
      text: "Claims circulated alleging Russian military units had fully withdrawn to pre-2014 borders.",
      debunkProof: "Debunked: Frontline monitoring confirms continuous Russian military deployment and combat operations in occupied territories."
    }
  },

  // 2. GEN Z & YOUTH PROTESTS
  {
    id: 'genz-protest-001',
    category: 'GEN_Z_PROTESTS',
    realFact: {
      title: "Gen Z-led nationwide protests in Kenya forced the government to withdraw the 2024 Finance Bill.",
      text: "Reporting by Al Jazeera, BBC, and The Daily Nation confirmed that youth-led Gen Z demonstrations against proposed tax hikes across Nairobi and major Kenyan cities compelled President William Ruto to decline signing the Finance Bill 2024.",
      sources: ['Al Jazeera', 'BBC News', 'Daily Nation Kenya', 'Reuters']
    },
    fakeRumor: {
      title: "Kenya Finance Bill 2024 was signed into law without amendments during Gen Z protests.",
      text: "Online misinformation asserted that the controversial tax bill was enacted unchanged despite street demonstrations.",
      debunkProof: "Debunked: President William Ruto officially announced the total withdrawal and rejection of the Finance Bill on national television."
    }
  },
  {
    id: 'genz-protest-002',
    category: 'GEN_Z_PROTESTS',
    realFact: {
      title: "Student quota reform demonstrations in Bangladesh led to the resignation and departure of Sheikh Hasina.",
      text: "International wire reports from Reuters, The Hindu, and AP News verified that weeks of student-led quota movement protests culminated in Prime Minister Sheikh Hasina resigning on August 5, 2024, and the formation of an interim government led by Muhammad Yunus.",
      sources: ['The Hindu', 'Reuters', 'AP News', 'Prothom Alo']
    },
    fakeRumor: {
      title: "Sheikh Hasina remains the active, serving Prime Minister of Bangladesh in Dhaka.",
      text: "Unverified claims suggested that the Bangladesh prime minister had not resigned and continued governing from the Prime Minister's Office.",
      debunkProof: "Debunked: Sheikh Hasina submitted her formal resignation to the President and departed to India; an interim administration assumed executive powers."
    }
  },

  // 3. RAM MANDIR & TRUST FACT-CHECKS
  {
    id: 'ram-mandir-001',
    category: 'RAM_MANDIR',
    realFact: {
      title: "Ram Mandir is located in Ayodhya, Uttar Pradesh, constructed under the Shri Ram Janmabhoomi Teerth Kshetra Trust.",
      text: "Government gazettes, Supreme Court records, and verified reporting from The Hindu and PTI confirm that the Ram Janmabhoomi temple is located in Ayodhya, Uttar Pradesh, India, with the consecration ceremony held in January 2024.",
      sources: ['The Hindu', 'Press Trust of India (PTI)', 'PIB India', 'Supreme Court Records']
    },
    fakeRumor: {
      title: "The newly constructed Ram Mandir is located in Pakistan or disputed foreign territory.",
      text: "Fabricated claims circulated asserting that the Ram Janmabhoomi temple was built outside Indian sovereign territory.",
      debunkProof: "Debunked: Verified geographic coordinates (26.7956° N, 82.1943° E) and state administration confirm location in Ayodhya, Uttar Pradesh, India."
    }
  },
  {
    id: 'ram-mandir-002',
    category: 'RAM_MANDIR',
    realFact: {
      title: "Audited financial accounts and land purchases for Ram Mandir were submitted to statutory authorities.",
      text: "Fact-checks by BOOM Live, Vishvas News, and PTI audited allegations regarding Ayodhya land registry transactions, confirming market valuation registries and banking transfer records through transparent statutory trusts.",
      sources: ['BOOM Live', 'Vishvas News', 'PTI Fact Check', 'Indian Express']
    },
    fakeRumor: {
      title: "Viral claims alleging 1000 crore cash scam in Ram Mandir donation gold accounts without bank audit.",
      text: "Viral WhatsApp forwards claimed that all public temple donations were embezzled without ledger records or banking receipts.",
      debunkProof: "Debunked: The Shri Ram Janmabhoomi Trust and Chartered Accountant audit reports confirmed all donations are digitally audited under SBI/PNB accounts with 80G tax exemptions."
    }
  },

  // 4. RULING GOVERNMENT & ELECTIONS
  {
    id: 'govt-policy-001',
    category: 'GOVERNMENT_POLICIES',
    realFact: {
      title: "Narendra Modi is the serving Prime Minister of India heading the NDA Union Cabinet.",
      text: "Official press releases from the Press Information Bureau (PIB) and President's Secretariat confirm Narendra Modi was sworn in as the Prime Minister of India following the June 2024 general election results.",
      sources: ['Press Information Bureau (PIB)', 'Sansad TV', 'The Hindu', 'NDTV']
    },
    fakeRumor: {
      title: "Rahul Gandhi or opposition leader was sworn in as Prime Minister of India in 2024.",
      text: "Misleading election victory graphics claimed that an opposition leader was sworn in as the 15th Prime Minister of India.",
      debunkProof: "Debunked: Official oath of office was administered to Prime Minister Narendra Modi at Rashtrapati Bhavan on June 9, 2024."
    }
  },
  {
    id: 'govt-policy-002',
    category: 'GOVERNMENT_POLICIES',
    realFact: {
      title: "Pradhan Mantri Awas Yojana (PMAY) provides subsidized housing assistance to eligible urban and rural beneficiaries.",
      text: "Ministry of Housing and Urban Affairs documentation verifies the government approved the construction of over 3 crore additional rural and urban housing units under PMAY-Urban and PMAY-Gramin expansions.",
      sources: ['Ministry of Housing and Urban Affairs', 'PIB India', 'The Economic Times']
    },
    fakeRumor: {
      title: "Government announced direct transfer of Rs 5 lakh cash to every citizen bank account under housing scheme.",
      text: "Viral phishing messages claimed that the Union Government is depositing 5 lakh cash directly into all bank accounts without application.",
      debunkProof: "Debunked: PIB Fact Check confirmed PMAY provides targeted interest subsidies and staged construction disbursements directly to verified geo-tagged houses, not unconditional cash transfers."
    }
  },

  // 5. SPORTS TOURNAMENTS & CHAMPIONS
  {
    id: 'sports-champ-001',
    category: 'SPORTS',
    realFact: {
      title: "India won the ICC Men's T20 World Cup 2024 by defeating South Africa in the final at Barbados.",
      text: "Official ICC tournament records, BCCI match reports, and global coverage from ESPNcricinfo and Reuters confirm India defeated South Africa by 7 runs in Bridgetown, Barbados on June 29, 2024.",
      sources: ['International Cricket Council (ICC)', 'ESPNcricinfo', 'Reuters', 'The Hindu']
    },
    fakeRumor: {
      title: "South Africa won the ICC Men's T20 World Cup 2024 final against India.",
      text: "Inverted match result posts claimed South Africa lifted the T20 World Cup 2024 trophy.",
      debunkProof: "Debunked: India successfully defended 176 runs to win the final by 7 runs, clinching their second T20 World Cup title."
    }
  },
  {
    id: 'sports-champ-002',
    category: 'SPORTS',
    realFact: {
      title: "Kolkata Knight Riders (KKR) won the 2024 Indian Premier League (IPL) title.",
      text: "IPL official records and sports news reports from ESPNcricinfo and Indian Express verify KKR defeated Sunrisers Hyderabad in the final at MA Chidambaram Stadium, Chennai.",
      sources: ['Indian Premier League (IPL)', 'ESPNcricinfo', 'Indian Express']
    },
    fakeRumor: {
      title: "Chennai Super Kings (CSK) or Royal Challengers Bengaluru won the IPL 2024 championship.",
      text: "Misleading fan posts circulated claiming CSK won their sixth IPL title in 2024.",
      debunkProof: "Debunked: KKR won the 2024 championship final by 8 wickets, securing their third IPL franchise title."
    }
  }
];

export class LiveNewsIngestionTrainerService {
  private indexPath: string = path.resolve(__dirname, '../data/datasetVectorIndex.json');
  private datasetPath: string = path.resolve(__dirname, '../data/fakeNewsDataset.json');

  /**
   * Trains and updates the local vector database with the verified multi-newspaper corpus
   */
  public async trainAndIndexCorpus(): Promise<{ addedItems: number; totalItems: number; durationMs: number }> {
    const startTime = Date.now();
    console.log(`\n========================================================================`);
    console.log(`🧠 STARTING SELF-TRAINING & LOCAL VECTOR INDEX CALIBRATION`);
    console.log(`Topics: Russia-Ukraine, Gen Z Protests, Ram Mandir, Govt Policies, Sports`);
    console.log(`========================================================================\n`);

    // Load existing index if present
    let existingIndex: DatasetVectorIndex = {
      version: '2.0.0-calibrated',
      createdAt: new Date().toISOString(),
      totalRows: 0,
      validExamples: 0,
      duplicatesRemoved: 0,
      labelDistribution: { fake: 0, real: 0 },
      items: []
    };

    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        existingIndex = JSON.parse(raw);
        console.log(`[Trainer] Loaded existing index containing ${existingIndex.items.length} vector embeddings.`);
      } catch (err) {
        console.warn(`[Trainer] Could not parse existing index, generating fresh index.`);
      }
    }

    const itemsMap = new Map<string, DatasetVectorItem>();
    // Seed existing items
    for (const item of existingIndex.items) {
      itemsMap.set(item.id, item);
    }

    let addedCount = 0;

    for (const pair of MULTI_SOURCE_TRAINING_CORPUS) {
      // 1. Process REAL Fact
      const realId = `live-${pair.category.toLowerCase()}-${pair.id}-real`;
      if (!itemsMap.has(realId)) {
        console.log(`[Trainer] Embedding REAL: "${pair.realFact.title}"`);
        const embedding = await embeddingService.embedText(`${pair.realFact.title} ${pair.realFact.text}`);
        itemsMap.set(realId, {
          id: realId,
          label: 'REAL',
          title: pair.realFact.title,
          text: pair.realFact.text,
          embedding,
        });
        addedCount++;
      }

      // 2. Process FAKE / Misleading Rumor
      const fakeId = `live-${pair.category.toLowerCase()}-${pair.id}-fake`;
      if (!itemsMap.has(fakeId)) {
        console.log(`[Trainer] Embedding FAKE: "${pair.fakeRumor.title}"`);
        const embedding = await embeddingService.embedText(`${pair.fakeRumor.title} ${pair.fakeRumor.text} ${pair.fakeRumor.debunkProof}`);
        itemsMap.set(fakeId, {
          id: fakeId,
          label: 'FAKE',
          title: pair.fakeRumor.title,
          text: `${pair.fakeRumor.text} | ${pair.fakeRumor.debunkProof}`,
          embedding,
        });
        addedCount++;
      }
    }

    const allItems = Array.from(itemsMap.values());
    const realCount = allItems.filter((i) => i.label === 'REAL').length;
    const fakeCount = allItems.filter((i) => i.label === 'FAKE').length;

    const updatedIndex: DatasetVectorIndex = {
      version: '2.0.0-calibrated',
      createdAt: new Date().toISOString(),
      totalRows: allItems.length,
      validExamples: allItems.length,
      duplicatesRemoved: 0,
      labelDistribution: {
        real: realCount,
        fake: fakeCount,
      },
      items: allItems,
    };

    // Write updated vector index to disk
    fs.writeFileSync(this.indexPath, JSON.stringify(updatedIndex, null, 2), 'utf-8');
    console.log(`\n[Trainer] 💾 Saved calibrated vector index to: ${this.indexPath}`);
    console.log(`[Trainer] Total Embedded Exemplars: ${allItems.length} (${realCount} REAL, ${fakeCount} FAKE)`);

    const durationMs = Date.now() - startTime;
    return {
      addedItems: addedCount,
      totalItems: allItems.length,
      durationMs,
    };
  }
}

export const liveNewsIngestionTrainer = new LiveNewsIngestionTrainerService();
export default liveNewsIngestionTrainer;
