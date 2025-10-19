type TagsForProjectInput = {
  projectTag: string;
  extraTags?: string;
  defaultExcludes?: string;
};

export function tagsForProject({ projectTag, extraTags, defaultExcludes = 'not @Skip and not @ignore' }: TagsForProjectInput): string {
  if (extraTags) return `${defaultExcludes} and ${projectTag} and (${extraTags})`;
  return `${defaultExcludes} and ${projectTag}`;
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
