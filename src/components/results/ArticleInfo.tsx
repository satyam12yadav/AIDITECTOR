import React from 'react';

interface ArticleInfoProps {
  title: string;
  publisher: string;
  author: string;
  publishedAt: string;
  url?: string;
  wordCount?: number;
}

export const ArticleInfo: React.FC<ArticleInfoProps> = ({
  title,
  publisher,
  author,
  publishedAt,
  url,
  wordCount,
}) => {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 md:p-6 shadow-subtle flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-label-caps text-xs text-outline uppercase font-bold tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">article</span>
            Article Metadata
          </span>
          {wordCount !== undefined && wordCount > 0 && (
            <span className="font-label-code text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
              {wordCount.toLocaleString()} words
            </span>
          )}
        </div>

        <h3 className="font-headline-md text-base md:text-lg font-bold text-on-surface leading-snug mb-4">
          {title}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Publisher</span>
            <span className="font-semibold text-on-surface truncate">{publisher || 'Unspecified'}</span>
          </div>

          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Author</span>
            <span className="font-semibold text-on-surface truncate">{author || 'Unspecified'}</span>
          </div>

          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Published Date</span>
            <span className="font-mono text-on-surface-variant truncate">{publishedAt || 'Unspecified'}</span>
          </div>

          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Source Registry</span>
            <span className="font-mono text-primary truncate">
              {url ? new URL(url).hostname : 'Direct Text Ingestion'}
            </span>
          </div>
        </div>
      </div>

      {url && (
        <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between">
          <span className="font-label-code text-[11px] text-outline truncate max-w-[200px] md:max-w-xs">
            {url}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-label-caps text-xs text-primary font-bold hover:text-secondary underline transition-colors"
          >
            <span>Open Article</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>
      )}
    </div>
  );
};
