"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ensureFencedCode } from "@/lib/ensureFencedCode";
import "highlight.js/styles/github-dark.css";

type Props = {
  /** Markdown string (supports fenced ``` code blocks, inline `code`, lists). */
  content: string;
  className?: string;
};

/**
 * Renders exam markdown with syntax highlighting for fenced code blocks.
 * Uses GFM so ``` fences parse reliably.
 */
export function MarkdownBlock({ content, className = "" }: Props) {
  if (!content?.trim()) return null;
  const md = ensureFencedCode(content);
  return (
    <div
      className={`question-body prose prose-zinc max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:my-3 prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {md}
      </ReactMarkdown>
    </div>
  );
}
