type TagsForProjectInput = {
  /** Optional tag a project is limited to, e.g. '@smoke'. Not needed for the built-in steps. */
  projectTag?: string;
  /** Extra tag expression, typically from `resolveExtraTags(process.env.TEST_TAGS)`. */
  extraTags?: string;
  defaultExcludes?: string;
};

/** Build a playwright-bdd `tags` expression: default excludes, optional project tag, optional extra tags. */
export function tagsForProject({ projectTag, extraTags, defaultExcludes = 'not @Skip and not @ignore' }: TagsForProjectInput = {}): string {
  return [defaultExcludes, projectTag, extraTags && `(${extraTags})`].filter(Boolean).join(' and ');
}

export function resolveExtraTags(raw?: string | null): string | undefined {
  const tagFilterRaw = raw?.trim();
  if (!tagFilterRaw) return undefined;
  const looksLikeExpression = /\s|@|\bnot\b|\band\b|\bor\b/.test(tagFilterRaw);
  if (looksLikeExpression) return tagFilterRaw;

  const parts = tagFilterRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('@') ? t : `@${t}`));
  if (!parts.length) return undefined;
  return parts.join(' or ');
}
