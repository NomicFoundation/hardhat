export function fromEntries<T = any>(entries: Array<[string, any]>): T {
  return Object.assign(
    {},
    ...entries.map(([name, value]) => ({
      [name]: value
    }))
  );
}
