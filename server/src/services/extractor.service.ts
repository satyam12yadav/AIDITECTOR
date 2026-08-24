import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import { AppError } from '../middleware/errorHandler.js';

export interface ExtractedArticle {
  title: string;
  author: string | null;
  publishedAt: string | null;
  publisher: string | null;
  url: string;
  text: string;
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

export class ExtractorService {
  /**
   * Validates target URL against malformed patterns and SSRF risks
   */
  public validateUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
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
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
          `Connection to '${validUrl.hostname}' timed out after 12 seconds. The host is unreachable.`,
          504,
          'REQUEST_TIMEOUT'
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

    // 1. Extract JSON-LD metadata if present
    const jsonLd = this.extractJsonLd($);

    // 2. Extract Title
    const title =
      jsonLd?.headline ||
      jsonLd?.name ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('article h1').first().text().trim() ||
      $('h1').first().text().trim() ||
      $('title').first().text().trim() ||
      'Untitled Article';

    const cleanedTitle = this.cleanTitle(title, pageUrl);

    // 3. Extract Author
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

    // 4. Extract Publication Date
    const rawDate =
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

    const formattedDate = this.formatDate(rawDate);

    // 5. Extract Publisher
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

    // 6. Extract Canonical URL
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

    // 7. Extract Main Article Body Text
    const text = this.extractBodyText($);

    // 8. Validate Content Boundaries
    if (!text || text.length < 80) {
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
      publishedAt: formattedDate,
      publisher: decode(publisher),
      url: resolvedCanonical,
      text: decode(processedText),
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
              datePublished: item.datePublished || item.dateCreated || item.dateModified,
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
    // Remove common site suffix separators ( | , - , – , — , » , • )
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
        '.nav, .navbar, .menu, .sidebar, .footer, .advertisement, .ad, .ads, ' +
        '.banner, .cookie-notice, .cookie-banner, .social-share, .share-buttons, ' +
        '.comments, #comments, .related-posts, .recommended-articles, form, button, dialog'
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
