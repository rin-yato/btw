export function mergeObjects<T extends Record<string, unknown>>(
  ...objects: (Partial<T> | undefined | null)[]
): T {
  return Object.assign({}, ...objects) as T;
}
