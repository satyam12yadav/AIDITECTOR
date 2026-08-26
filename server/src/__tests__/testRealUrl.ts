import { extractorService } from '../services/extractor.service.js';

async function main() {
  const testUrls = [
    'https://en.wikipedia.org/wiki/Asia',
    'https://www.thehindu.com',
  ];

  console.log('Testing Real Article URLs...\n');

  // Test 1: Wikipedia Real Article
  try {
    const res1 = await extractorService.extract(testUrls[0]);
    console.log('✅ URL 1 (Wikipedia):');
    console.log('   Title:', res1.title);
    console.log('   Publisher:', res1.publisher);
    console.log('   Status:', res1.extractionStatus);
    console.log('   Quality Score:', res1.extractionQualityScore);
    console.log('   Text Length:', res1.text.length);
    console.log('   Snippet:', res1.text.slice(0, 150), '...\n');
  } catch (err: any) {
    console.error('❌ URL 1 Failed:', err.message);
  }

  // Test 2: Homepage Rejection
  try {
    const res2 = await extractorService.extract(testUrls[1]);
    console.log('⚠️ URL 2 (Homepage) Result:', res2.title);
  } catch (err: any) {
    console.log('✅ URL 2 (Homepage) Expected Rejection:', err.message, `(${err.errorCode})\n`);
  }
}

main().catch(console.error);
