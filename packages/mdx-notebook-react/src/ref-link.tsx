import type { ReactNode } from "react";

export interface RefLinkProps {
  href: string;
  label?: string;
  children?: ReactNode;
}

export function RefLink({ href, label, children }: RefLinkProps) {
  return (
    <a className="mdx-nb-ref-link" href={href} title={label}>
      {children ?? label ?? href}
    </a>
  );
}
