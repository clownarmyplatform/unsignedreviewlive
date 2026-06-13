"use client";

import ReactMarkdown from "react-markdown";

export function NoticeboardMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-p:text-zinc-300 prose-p:leading-7 prose-headings:text-white prose-strong:text-white prose-em:text-zinc-200 prose-ul:text-zinc-300 prose-ol:text-zinc-300 prose-li:my-1 prose-a:text-amber-300 prose-a:no-underline hover:prose-a:text-amber-200">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 text-2xl font-semibold text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 text-xl font-semibold text-white first:mt-0">
              {children}
            </h2>
          ),
          p: ({ children }) => <p className="mt-3 text-sm leading-7">{children}</p>,
          ul: ({ children }) => <ul className="mt-3 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mt-3 list-decimal pl-5">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-2 border-amber-300/40 pl-4 text-zinc-300">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 underline underline-offset-4"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
