import type { MDXComponents } from "mdx/types";

// Required by @next/mdx with the App Router.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
