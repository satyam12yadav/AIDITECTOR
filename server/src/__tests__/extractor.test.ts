import { extractorService } from '../services/extractor.service.js';
import { AppError } from '../middleware/errorHandler.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, diagnostics?: Record<string, any>) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (diagnostics) {
      console.error(`     Diagnostic Report:`, JSON.stringify(diagnostics, null, 2));
    }
    failedCount++;
  }
}

console.log('\n============================================================');
console.log('🌐 STEP 10: REAL-WORLD URL & ARTICLE EXTRACTION TEST SUITE');
console.log('============================================================\n');

// ----------------------------------------------------------------------
// TEST A: Normal News Article Extraction
// ----------------------------------------------------------------------
console.log('--- TEST A: Normal News Article Extraction ---');
{
  const mockHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cabinet Approves ₹10,000 Crore Infrastructure Project | The Indian Express</title>
        <meta name="author" content="By Rajesh Sharma" />
        <meta property="article:published_time" content="2026-08-25T10:00:00Z" />
        <meta property="article:modified_time" content="2026-08-25T14:30:00Z" />
        <meta property="og:site_name" content="The Indian Express" />
        <link rel="canonical" href="https://indianexpress.com/article/india/cabinet-approves-infra-project" />
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/politics">Politics</a></nav>
        <header><h1>The Indian Express Header</h1></header>
        <main>
          <article class="article-body">
            <h1>Cabinet Approves ₹10,000 Crore Infrastructure Project</h1>
            <p class="byline">By Rajesh Sharma</p>
            <p>The Union Cabinet on Monday approved a major ₹10,000 crore infrastructure development package for regional transit connectivity.</p>
            <p>The initiative will expand high-speed express corridors across three Northern states, creating an estimated 45,000 direct jobs during the execution phase.</p>
            <p>Union Ministers highlighted that construction is slated to commence by November 2026 with an operational deadline set for late 2029.</p>
          </article>
        </main>
        <footer><p>Copyright 2026 The Indian Express. All rights reserved.</p></footer>
      </body>
    </html>
  `;

  const article = extractorService.parseHtml(mockHtml, 'https://indianexpress.com/article/india/cabinet-approves-infra-project');
  assert(article.title === 'Cabinet Approves ₹10,000 Crore Infrastructure Project', 'A: Clean title extracted without site suffix', { title: article.title });
  assert(article.author === 'Rajesh Sharma', 'A: Author name cleaned of "By" prefix', { author: article.author });
  assert(article.publishedAt !== null && article.publishedAt.includes('2026-08-25'), 'A: Published date normalized', { publishedAt: article.publishedAt });
  assert(article.publisher === 'The Indian Express', 'A: Publisher extracted correctly', { publisher: article.publisher });
  assert(article.text.includes('₹10,000 crore infrastructure development package'), 'A: Main article text body extracted cleanly');
  assert(!article.text.includes('The Indian Express Header') && !article.text.includes('Home Politics'), 'A: Navigation and headers stripped');
  assert(article.extractionStatus === 'COMPLETE', 'A: Extraction status is COMPLETE');
  assert(article.extractionQualityScore >= 80, 'A: Extraction quality score >= 80', { score: article.extractionQualityScore });
}

// ----------------------------------------------------------------------
// TEST B: Government Article Extraction
// ----------------------------------------------------------------------
console.log('\n--- TEST B: Government Article Extraction ---');
{
  const mockGovHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Press Information Bureau - Ministry of Finance</title>
        <meta name="publisher" content="Press Information Bureau" />
        <meta name="publish-date" content="2026-08-26" />
      </head>
      <body>
        <div id="content" class="main-content">
          <h1>Release on GST Revenue Collections for July 2026</h1>
          <p>Gross Goods and Services Tax (GST) revenue collections for the month of July 2026 reached ₹1.82 lakh crore, recording an 8.5% year-on-year growth.</p>
          <p>The domestic transactions contributed ₹1.35 lakh crore while import of goods accounted for ₹47,000 crore in the reviewed period.</p>
        </div>
      </body>
    </html>
  `;

  const govArticle = extractorService.parseHtml(mockGovHtml, 'https://pib.gov.in/PressReleasePage.aspx?PRID=2045000');
  assert(govArticle.text.includes('Gross Goods and Services Tax (GST) revenue collections'), 'B: Government announcement text extracted');
  assert(govArticle.publisher === 'Press Information Bureau', 'B: Government publisher identified');
}

// ----------------------------------------------------------------------
// TEST C: Long Article with Advertisements & Noise Removed
// ----------------------------------------------------------------------
console.log('\n--- TEST C: Long Article with Ads & Social Widgets Removed ---');
{
  const mockClutteredHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Scientific Expedition Discovers New Deep-Sea Ecosystem | Science News</title></head>
      <body>
        <div class="cookie-banner"><p>We use cookies to improve your experience. Accept all cookies.</p></div>
        <div class="ad-banner" id="google_ads_top"><p>Buy luxury watches now with 50% discount!</p></div>
        <article class="entry-content">
          <h1>Scientific Expedition Discovers New Deep-Sea Ecosystem</h1>
          <p>Marine biologists exploring the Pacific oceanic trench have documented a previously unknown hydrothermal vent ecosystem flourishing at depths exceeding 6,000 meters.</p>
          <div class="advertisement"><p>Special car insurance offer click here.</p></div>
          <p>The expedition recovered distinct samples of chemosynthetic tube worms and bioluminescent crustacean species adapted to extreme pressures and toxic sulfide concentrations.</p>
          <div class="social-share"><button>Share on Facebook</button><button>Tweet this</button></div>
          <p>Genome sequencing indicates this marine community has existed in evolutionary isolation for tens of millions of years.</p>
          <div class="related-articles"><p>Read next: Top 10 beach vacations for summer.</p></div>
          <div class="newsletter-signup"><p>Subscribe to our daily science briefing.</p></div>
        </article>
      </body>
    </html>
  `;

  const longArticle = extractorService.parseHtml(mockClutteredHtml, 'https://sciencenews.org/article/deep-sea-discovery');
  assert(longArticle.text.includes('Marine biologists exploring the Pacific oceanic trench'), 'C: Core scientific text extracted');
  assert(!longArticle.text.includes('cookies to improve your experience'), 'C: Cookie banner removed');
  assert(!longArticle.text.includes('Buy luxury watches'), 'C: Ad banner removed');
  assert(!longArticle.text.includes('Share on Facebook'), 'C: Social share buttons removed');
  assert(!longArticle.text.includes('Top 10 beach vacations'), 'C: Related articles removed');
  assert(!longArticle.text.includes('Subscribe to our daily science'), 'C: Newsletter signup prompt removed');
}

// ----------------------------------------------------------------------
// TEST D: Article with Images
// ----------------------------------------------------------------------
console.log('\n--- TEST D: Article with Multiple Images ---');
{
  const mockImgHtml = `
    <html>
      <head><title>Spacecraft Achieves Lunar Landing</title></head>
      <body>
        <article>
          <h1>Spacecraft Achieves Lunar Landing</h1>
          <img src="/img/spacecraft1.jpg" alt="Spacecraft landing gear" />
          <p>The unmanned exploration module executed a precision soft touchdown near the lunar south pole early Wednesday morning.</p>
          <figure><img src="/img/surface.jpg" /><figcaption>Surface telemetry</figcaption></figure>
          <p>Onboard scientific instruments immediately commenced solar radiation and subsurface seismic measurements.</p>
        </article>
      </body>
    </html>
  `;

  const imgArticle = extractorService.parseHtml(mockImgHtml, 'https://space.org/landing');
  assert(imgArticle.text.includes('unmanned exploration module executed a precision soft touchdown'), 'D: Text extracted seamlessly alongside images');
}

// ----------------------------------------------------------------------
// TEST E: Paywalled / Partially Accessible Article
// ----------------------------------------------------------------------
console.log('\n--- TEST E: Paywalled / Partially Accessible Article ---');
{
  const mockPaywallHtml = `
    <html>
      <head><title>Exclusive Investigative Report on Market Trends</title></head>
      <body>
        <article class="post-content">
          <h1>Exclusive Investigative Report on Market Trends</h1>
          <p>Internal financial audits reveal substantial shifts in commodity investment portfolios during the first quarter.</p>
          <div class="paywall-overlay">
            <p>Subscribe to continue reading this exclusive report. Premium members only get full investigative access.</p>
          </div>
        </article>
      </body>
    </html>
  `;

  const paywallArticle = extractorService.parseHtml(mockPaywallHtml, 'https://financialdaily.com/exclusive-report');
  assert(paywallArticle.isPartial === true, 'E: Paywall detected and marked isPartial = true', { isPartial: paywallArticle.isPartial });
  assert(paywallArticle.extractionStatus === 'PARTIAL', 'E: Extraction status marked PARTIAL');
  assert(paywallArticle.warning?.includes('part of this article was accessible'), 'E: Warning message provided for partial article', { warning: paywallArticle.warning });
}

// ----------------------------------------------------------------------
// TEST F: Invalid URL Validation
// ----------------------------------------------------------------------
console.log('\n--- TEST F: Invalid URL Validation ---');
{
  let errorCaught = false;
  try {
    extractorService.validateUrl('not-a-valid-url');
  } catch (err: any) {
    errorCaught = true;
    assert(err.errorCode === 'INVALID_URL', 'F: Malformed URL throws INVALID_URL code', { code: err.errorCode });
  }
  assert(errorCaught, 'F: Invalid URL rejected');

  let ftpCaught = false;
  try {
    extractorService.validateUrl('ftp://files.example.com/data.txt');
  } catch (err: any) {
    ftpCaught = true;
    assert(err.errorCode === 'UNSUPPORTED_PROTOCOL', 'F: Non-HTTP protocol throws UNSUPPORTED_PROTOCOL');
  }
  assert(ftpCaught, 'F: Unsupported FTP protocol rejected');

  let pdfCaught = false;
  try {
    extractorService.validateUrl('https://example.com/document.pdf');
  } catch (err: any) {
    pdfCaught = true;
    assert(err.errorCode === 'UNSUPPORTED_MEDIA_TYPE', 'F: Direct PDF file throws UNSUPPORTED_MEDIA_TYPE');
  }
  assert(pdfCaught, 'F: PDF file URL rejected');
}

// ----------------------------------------------------------------------
// TEST G: Non-Article Homepage Rejection
// ----------------------------------------------------------------------
console.log('\n--- TEST G: Non-Article Homepage Rejection ---');
{
  const mockHomepageHtml = `
    <html>
      <head><title>Global News Network - Home Index</title></head>
      <body>
        <header><h1>Global News Network</h1></header>
        <nav>
          <a href="/world">World</a><a href="/sports">Sports</a><a href="/tech">Tech</a>
          <a href="/biz">Business</a><a href="/culture">Culture</a><a href="/video">Video</a>
          <a href="/weather">Weather</a><a href="/travel">Travel</a><a href="/autos">Autos</a>
          <a href="/lifestyle">Lifestyle</a><a href="/health">Health</a><a href="/science">Science</a>
          <a href="/opinion">Opinion</a><a href="/local">Local</a><a href="/podcasts">Podcasts</a>
          <a href="/markets">Markets</a><a href="/deals">Deals</a><a href="/subscribe">Subscribe</a>
        </nav>
      </body>
    </html>
  `;

  let homepageRejected = false;
  try {
    extractorService.parseHtml(mockHomepageHtml, 'https://globalnews.com/');
  } catch (err: any) {
    homepageRejected = true;
    assert(err.errorCode === 'HOMEPAGE_NOT_SUPPORTED', 'G: Root homepage correctly identified and rejected', { code: err.errorCode });
  }
  assert(homepageRejected, 'G: Non-article homepage rejected');
}

// ----------------------------------------------------------------------
// TEST H: Error Page Detection (e.g. 404 / Bot Challenge)
// ----------------------------------------------------------------------
console.log('\n--- TEST H: Error Page Detection ---');
{
  const mock404Html = `
    <html>
      <head><title>404 Not Found - Page Missing</title></head>
      <body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body>
    </html>
  `;

  let errorPageCaught = false;
  try {
    extractorService.parseHtml(mock404Html, 'https://example.com/old-story');
  } catch (err: any) {
    errorPageCaught = true;
    assert(err.errorCode === 'ERROR_PAGE_DETECTED', 'H: 404 error page detected and rejected', { code: err.errorCode });
  }
  assert(errorPageCaught, 'H: Error page rejected');
}

// ----------------------------------------------------------------------
// TEST I: Insufficient / JS-Heavy Content
// ----------------------------------------------------------------------
console.log('\n--- TEST I: Insufficient / JS-Heavy Content ---');
{
  const mockJsHeavyHtml = `
    <html>
      <head><title>Dynamic React App</title></head>
      <body><div id="root">Loading application...</div></body>
    </html>
  `;

  let jsCaught = false;
  try {
    extractorService.parseHtml(mockJsHeavyHtml, 'https://reactapp.com/story/123');
  } catch (err: any) {
    jsCaught = true;
    assert(err.errorCode === 'INSUFFICIENT_CONTENT', 'I: Insufficient text throws INSUFFICIENT_CONTENT', { code: err.errorCode });
  }
  assert(jsCaught, 'I: Empty JS page rejected without hallucination');
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
