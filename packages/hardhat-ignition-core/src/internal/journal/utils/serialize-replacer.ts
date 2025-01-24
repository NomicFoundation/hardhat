/**
 * When stringifying messages to the journal, this defines the replacer.
 */
export function serializeReplacer(_key: string, value: unknown) {
  if (value instanceof Set) {
    return Array.from(value).sort();
  }

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  if (typeof value === "bigint") {
    return { _kind: "bigint", value: value.toString(10) };
  }

  if (value instanceof Object && !(value instanceof Array)) {
    const obj: any = value;
    return Object.keys(obj)
      .sort()
      .reduce((sorted: any, key) => {
        sorted[key] = obj[key];
        return sorted;
      }, {});
  }

  return value;
}
