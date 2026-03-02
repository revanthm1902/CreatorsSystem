import { useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  const html = useMemo(() => marked.parse(children, { async: false }) as string, [children]);
  return <div className={`prose-sm markdown-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
