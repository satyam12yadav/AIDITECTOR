import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import { AppError } from '../middleware/errorHandler.js';

export interface ExtractedArticle {
  title: string;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  retrievedAt: string;
  publisher: string | null;
  url: string;
  canonicalUrl: string | null;
  text: string;
  isPartial: boolean;
  extractionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  extractionQualityScore: number; // 0 - 100
  warning?: string;
}

const FORBIDDEN_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/Cloud metadata
];

const PRIVATE_IP_REGEX =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

const PAYWALL_PATTERNS = [
  /\b(subscribe to (read|continue|unlock)|exclusive for subscribers|premium members only|you have reached your limit of free articles|sign in to read the full story|already a subscriber\? log in|read the rest of this story with a subscription|register to continue reading)\b/i,
];

const ERROR_PAGE_PATTERNS = [
  /\b(404 not found|page not found|access denied|attention required! \| cloudflare|robot check|just a moment\.\.\.|403 forbidden|error 404)\b/i,
];

export class ExtractorService {
  /**
   * Validates target URL against malformed patterns and SSRF risks
   */
  public validateUrl(rawUrl: string): URL {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      throw new AppError('No URL provided. Please provide a valid web address.', 400, 'INVALID_URL');
    }

    const trimmed = rawUrl.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new AppError(
        `Invalid URL format: '${rawUrl}'. Please provide a valid HTTP or HTTPS web address.`,
        400,
        'INVALID_URL'
      );
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError(
        `Unsupported protocol '${parsed.protocol}'. Only HTTP and HTTPS articles are supported.`,
        400,
        'UNSUPPORTED_PROTOCOL'
      );
    }

    // Check for direct PDF links
    if (parsed.pathname.toLowerCase().endsWith('.pdf')) {
      throw new AppError(
        'Direct PDF files are currently not supported for HTML article extraction. Please provide an HTML article link.',
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      );
    }

    const hostname = parsed.hostname.toLowerCase();

    if (FORBIDDEN_HOSTS.includes(hostname) || PRIVATE_IP_REGEX.test(hostname)) {
      throw new AppError(
        'Access to local or private network addresses is restricted for security.',
        403,
        'FORBIDDEN_ADDRESS'
      );
    }

    return parsed;
  }

  /**
   * Retrieves and extracts article metadata and full text from a target URL
   */
  public async extract(targetUrl: string): Promise<ExtractedArticle> {
    const validUrl = this.validateUrl(targetUrl);

    let html: string;
    let finalUrl: string = validUrl.toString();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(validUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 FakeNewsKiller/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      finalUrl = response.url || validUrl.toString();

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(
            `Article not found (HTTP 404). The target URL does not exist or has been removed.`,
            404,
            'NOT_FOUND'
          );
        }
        if (response.status === 401 || response.status === 403) {
          throw new AppError(
            `Access denied (HTTP ${response.status}). The website requires authentication or restricts automated access.`,
            403,
            'ACCESS_DENIED'
          );
        }
        throw new AppError(
          `Target server returned HTTP ${response.status} (${response.statusText}). Could not reach article content.`,
          response.status >= 500 ? 502 : 400,
          'UNREACHABLE_HOST',
          { statusCode: response.status, statusText: response.statusText }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new AppError(
          `Unsupported document type '${contentType}'. Only HTML web articles can be processed.`,
          415,
          'UNSUPPORTED_MEDIA_TYPE'
        );
      }

      html = await response.text();
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      if (err.name === 'AbortError') {
        throw new AppError(
          `Connection to '${validUrl.hostname}' timed out after 8 seconds. The host is unreachable.`,
          504,
          'ARTICLE_FETCH_TIMEOUT'
        );
      }

      throw new AppError(
        `Failed to reach target host '${validUrl.hostname}': ${err.message}`,
        502,
        'HOST_CONNECTION_FAILED',
        { originalError: err.message }
      );
    }

    if (!html || html.trim().length === 0) {
      throw new AppError(
        'The target web page returned an empty response body.',
        422,
        'EMPTY_RESPONSE'
      );
    }

    return this.parseHtml(html, finalUrl);
  }

  /**
   * Parses HTML using Cheerio, JSON-LD, OpenGraph, and Semantic DOM heuristics
   */
  public parseHtml(html: string, pageUrl: string): ExtractedArticle {
    const $ = cheerio.load(html);

    // 1. Check for Bot Challenges or Error Pages
    const rawPageTitle = $('title').first().text().trim();
    const rawBodySnippet = $('body').text().slice(0, 300);

    for (const errPat of ERROR_PAGE_PATTERNS) {
      if (errPat.test(rawPageTitle) || errPat.test(rawBodySnippet)) {
        throw new AppError(
          `The target URL returned an error page or security challenge: "${rawPageTitle || 'Error Page'}".`,
          422,
          'ERROR_PAGE_DETECTED'
        );
      }
    }

    // 2. Extract JSON-LD metadata if present
    const jsonLd = this.extractJsonLd($);

    // 3. Extract Title (Prefer article/main h1, then OpenGraph, then JSON-LD, then title tag)
    const articleH1 = $('article h1, [itemprop="headline"], .article-headline, .story-headline, .entry-title').first().text().trim();
    const mainH1 = $('main h1, #content h1, .main-content h1').first().text().trim();
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();
    const jsonLdTitle = (jsonLd?.headline && jsonLd.headline.length > 5) ? jsonLd.headline : (jsonLd?.name && jsonLd.name.length > 5 && jsonLd.name.length < 120) ? jsonLd.name : null;

    const rawTitle =
      articleH1 ||
      mainH1 ||
      ogTitle ||
      twitterTitle ||
      jsonLdTitle ||
      rawPageTitle ||
      'Untitled Article';

    const cleanedTitle = this.cleanTitle(rawTitle, pageUrl);

    // 4. Extract Author
    const author =
      jsonLd?.authorName ||
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('meta[name="twitter:creator"]').attr('content') ||
      $('meta[name="byl"]').attr('content') ||
      $('[rel="author"]').first().text().trim() ||
      $('.byline, .author, .author-name, .c-byline').first().text().trim() ||
      null;

    const cleanedAuthor = author ? author.replace(/^by\s+/i, '').trim() : null;

    // 5. Extract Publication & Modification Dates
    const rawPublished =
      jsonLd?.datePublished ||
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('meta[name="publish-date"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('meta[name="DC.date.issued"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('time').first().attr('datetime') ||
      $('time').first().text().trim() ||
      null;

    const rawModified =
      jsonLd?.dateModified ||
      $('meta[property="article:modified_time"]').attr('content') ||
      $('meta[name="last-modified"]').attr('content') ||
      $('meta[name="updated_time"]').attr('content') ||
      null;

    const publishedAt = this.formatDate(rawPublished);
    const updatedAt = this.formatDate(rawModified);
    const retrievedAt = new Date().toISOString();

    // 6. Extract Publisher
    let parsedHost = '';
    try {
      parsedHost = new URL(pageUrl).hostname.replace(/^www\./, '');
    } catch {
      parsedHost = pageUrl;
    }

    const publisher =
      jsonLd?.publisherName ||
      $('meta[property="og:site_name"]').attr('content') ||
      $('meta[name="application-name"]').attr('content') ||
      $('meta[name="publisher"]').attr('content') ||
      parsedHost;

    // 7. Extract Canonical URL
    const canonicalUrl =
      $('link[rel="canonical"]').attr('href') ||
      $('meta[property="og:url"]').attr('content') ||
      pageUrl;

    let resolvedCanonical = pageUrl;
    try {
      resolvedCanonical = new URL(canonicalUrl, pageUrl).toString();
    } catch {
      resolvedCanonical = pageUrl;
    }

    // 8. Check for Homepage / Index page (Non-article)
    const linkCount = $('a').length;
    const pCount = $('p').length;
    const urlObj = new URL(pageUrl);
    const isRootPath = urlObj.pathname === '' || urlObj.pathname === '/' || urlObj.pathname === '/index.html';
    const isHomeTitle = /\b(latest news|breaking news|top headlines|trending news|home|index|frontpage)\b/i.test(cleanedTitle);

    if (isRootPath && (isHomeTitle || (linkCount > 15 && pCount < 4))) {
      throw new AppError(
        'The provided URL appears to be a homepage or index directory rather than a specific news article.',
        422,
        'HOMEPAGE_NOT_SUPPORTED'
      );
    }

    // 9. Extract Main Article Body Text
    const text = this.extractBodyText($);

    // 10. Check Paywall & Content Quality
    let isPartial = false;
    let warning: string | undefined;

    const hasPaywallMarker = PAYWALL_PATTERNS.some((pat) => pat.test(text) || pat.test(html));
    if (hasPaywallMarker && text.length < 1000) {
      isPartial = true;
      warning = 'Only part of this article was accessible. Verification may be incomplete.';
    }

    // 11. Validate Content Boundaries
    if (!text || text.length < 100) {
      throw new AppError(
        'The page does not contain sufficient extractable article content (possible paywall, login gate, or dynamic client-side rendering).',
        422,
        'INSUFFICIENT_CONTENT',
        {
          extractedLength: text ? text.length : 0,
          title: cleanedTitle,
        }
      );
    }

    // Calculate internal extraction quality score (0 - 100)
    let extractionQualityScore = 50;
    if (cleanedTitle && cleanedTitle !== 'Untitled Article') extractionQualityScore += 20;
    if (cleanedAuthor) extractionQualityScore += 10;
    if (publishedAt) extractionQualityScore += 10;
    if (text.length >= 600) extractionQualityScore += 10;
    if (isPartial) extractionQualityScore = Math.min(65, extractionQualityScore);

    const extractionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED' = isPartial ? 'PARTIAL' : 'COMPLETE';

    // Cap maximum length safely at 50,000 characters
    let processedText = text;
    if (processedText.length > 50000) {
      processedText =
        processedText.substring(0, 50000) +
        '\n\n[...Content truncated at 50,000 characters for analysis...]';
    }

    return {
      title: decode(cleanedTitle),
      author: cleanedAuthor ? decode(cleanedAuthor) : null,
      publishedAt,
      updatedAt,
      retrievedAt,
      publisher: decode(publisher),
      url: resolvedCanonical,
      canonicalUrl: resolvedCanonical,
      text: decode(processedText),
      isPartial,
      extractionStatus,
      extractionQualityScore,
      warning,
    };
  }

  /**
   * Scans script tags for schema.org JSON-LD Article metadata
   */
  private extractJsonLd($: cheerio.CheerioAPI): {
    headline?: string;
    name?: string;
    authorName?: string;
    datePublished?: string;
    dateModified?: string;
    publisherName?: string;
  } | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const content = $(scripts[i]).html();
        if (!content) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch {
          continue;
        }

        const items = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];

        for (const item of items) {
          if (!item) continue;
          const type = item['@type'];
          const isArticle =
            type === 'Article' ||
            type === 'NewsArticle' ||
            type === 'BlogPosting' ||
            type === 'Report' ||
            type === 'AnalysisNewsArticle' ||
            type === 'WebPage';

          if (isArticle) {
            let authorName: string | undefined;
            if (typeof item.author === 'string') {
              authorName = item.author;
            } else if (item.author && typeof item.author.name === 'string') {
              authorName = item.author.name;
            } else if (Array.isArray(item.author) && item.author[0]?.name) {
              authorName = item.author.map((a: any) => a.name).join(', ');
            }

            let publisherName: string | undefined;
            if (typeof item.publisher === 'string') {
              publisherName = item.publisher;
            } else if (item.publisher && typeof item.publisher.name === 'string') {
              publisherName = item.publisher.name;
            }

            return {
              headline: item.headline,
              name: item.name,
              authorName,
              datePublished: item.datePublished || item.dateCreated,
              dateModified: item.dateModified,
              publisherName,
            };
          }
        }
      }
    } catch {
      // Ignore JSON-LD parsing errors and fall back to DOM
    }
    return null;
  }

  /**
   * Cleans document title from site suffixes (e.g. "Headline | Reuters" -> "Headline")
   */
  private cleanTitle(rawTitle: string, url: string): string {
    let title = rawTitle.trim();
    const splitIndex = title.search(/\s+[|\-–—»•]\s+/);
    if (splitIndex > 15) {
      title = title.substring(0, splitIndex).trim();
    }
    return title || 'Article';
  }

  /**
   * Normalizes dates into standard readable format
   */
  private formatDate(rawDate: string | null): string | null {
    if (!rawDate) return null;
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
      }
    } catch {
      // Return raw string if parsing fails
    }
    return rawDate.trim();
  }

  /**
   * Strips non-content elements and extracts clean article body text
   */
  private extractBodyText($: cheerio.CheerioAPI): string {
    // 1. Remove unwanted noisy elements from the clone DOM
    $(
      'script, style, noscript, iframe, svg, nav, header, footer, aside, ' +
        '.nav, .navbar, .menu, .sidebar, .footer, .advertisement, .ad, .ads, .ad-container, .ad-banner, ' +
        '.banner, .cookie-notice, .cookie-banner, .consent-banner, .social-share, .share-buttons, ' +
        '.comments, #comments, .related-posts, .related-articles, .recommended-articles, .more-stories, ' +
        '.newsletter-signup, .newsletter, form, button, dialog, [class*="cookie"], [class*="consent"]'
    ).remove();

    // 2. Target priority semantic containers
    const candidates = [
      'article',
      '[itemprop="articleBody"]',
      '.article-body',
      '.story-body',
      '.entry-content',
      '.post-content',
      '.article__body',
      '.content-body',
      'main',
      '.main-content',
      '#content',
    ];

    let targetElement: cheerio.Cheerio<any> | null = null;
    for (const selector of candidates) {
      const found = $(selector);
      if (found.length > 0) {
        const textLen = found.text().trim().length;
        if (textLen >= 150) {
          targetElement = found.first();
          break;
        }
      }
    }

    const searchScope = targetElement || $('body');

    // 3. Extract paragraphs and headers
    const paragraphs: string[] = [];

    searchScope.find('p, h2, h3, h4, blockquote, li').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      // Keep meaningful content
      if (text.length >= 25 && !text.toLowerCase().includes('all rights reserved')) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }

    // Fallback: entire text within searchScope
    return searchScope.text().replace(/\s+/g, ' ').trim();
  }
}

export const extractorService = new ExtractorService();
