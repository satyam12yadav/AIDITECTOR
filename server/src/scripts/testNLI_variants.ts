import { pipeline } from '@xenova/transformers';

async function test() {
  const pipe = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli', { quantized: true });

  const claim = "Russia completed a full military withdrawal of all armed forces from Ukrainian territory.";
  const title = "Address by the President of the Russian Federation";
  const snippet = "Address by the President of the Russian Federation. Reporting by Президент России. Published on Mon, 21 Feb 2022 08:00:00 GMT.";
  const combinedEvidence = `${title} ${snippet}`.slice(0, 600).trim();

  // Test new NLI logic
  const res: any = await pipe(combinedEvidence, ["true", "false", "unrelated"], {
    hypothesis_template: `This statement is {}: ${claim}`
  });

  console.log(`\nClaim: "${claim}"`);
  console.log(`Top label: ${res.labels[0]} (${(res.scores[0]*100).toFixed(1)}%)`);
  res.labels.forEach((l: string, idx: number) => {
    console.log(`  - ${l}: ${(res.scores[idx]*100).toFixed(1)}%`);
  });
}

test();
