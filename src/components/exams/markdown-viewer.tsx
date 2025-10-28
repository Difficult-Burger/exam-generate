"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const MarkdownViewer = ({ content }: { content: string }) => (
  <article className="prose prose-slate max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </article>
);
