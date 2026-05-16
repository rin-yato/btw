export function mergeObjects<T extends Record<string, unknown>>(
  ...objects: (Partial<T> | undefined | null)[]
): T {
  return Object.assign({}, ...objects) as T;
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
