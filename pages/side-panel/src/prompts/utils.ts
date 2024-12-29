type TokenMap = Record<string, unknown>;

export const replaceTokens = (template: string, tokens: TokenMap): string => {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    return path.split('.').reduce((obj: unknown, key: string) => {
      return (obj as Record<string, unknown>)?.[key];
    }, tokens);
  });
};
