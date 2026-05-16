export function mergeObjects<T extends object>(...objects: (object | undefined | null)[]): T {
  return Object.assign({}, ...objects) as T;
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
