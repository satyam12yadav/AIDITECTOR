import { pipeline } from '@xenova/transformers';

async function test() {
  const pipe = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli', { quantized: true });

  const cases = [
    {
      claim: "Satya Nadella is the CEO of Microsoft.",
      evidence: "Satya Nadella has served as the chief executive officer of Microsoft since 2014, succeeding Steve Ballmer."
    },
    {
      claim: "Bill Gates is the active CEO of Microsoft.",
      evidence: "Satya Nadella has served as the chief executive officer of Microsoft since 2014, succeeding Steve Ballmer."
    },
    {
      claim: "DNA has a double helix structure.",
      evidence: "DNA is composed of two polynucleotide chains that coil around each other to form a double helix carrying genetic instructions."
    },
    {
      claim: "DNA in human cells is structured as a triple helix.",
      evidence: "DNA is composed of two polynucleotide chains that coil around each other to form a double helix carrying genetic instructions."
    }
  ];

  for (const c of cases) {
    // Standard zero-shot entailment checking:
    const res: any = await pipe(c.evidence, [
      `true: ${c.claim}`,
      `false: ${c.claim}`,
      `unrelated to: ${c.claim}`
    ], {
      hypothesis_template: "This statement is {}."
    });
    console.log(`\nClaim: "${c.claim}"`);
    console.log(`Top label: ${res.labels[0]} (${(res.scores[0]*100).toFixed(1)}%)`);
    res.labels.forEach((l: string, idx: number) => console.log(`  - ${l}: ${(res.scores[idx]*100).toFixed(1)}%`));
  }
}

test();
