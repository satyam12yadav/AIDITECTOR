import { datasetSimilarityService } from '../services/datasetSimilarity.service.js';

async function main() {
  console.log('🚀 Starting FakeNewsDataset indexing process...');
  const index = await datasetSimilarityService.buildAndSaveIndex();
  console.log(`✅ Indexing complete!`);
  console.log(`- Total Rows Processed: ${index.totalRows}`);
  console.log(`- Valid Examples Stored: ${index.validExamples}`);
  console.log(`- Duplicates Removed: ${index.duplicatesRemoved}`);
  console.log(`- Distribution: ${index.labelDistribution.fake} FAKE, ${index.labelDistribution.real} REAL`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Indexing failed:', err);
  process.exit(1);
});
