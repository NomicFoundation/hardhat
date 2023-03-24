export function union<T>(setA: Set<T>, setB: Set<T>) {
  const _union = new Set(setA);

  for (const elem of setB) {
    _union.add(elem);
  }

  return _union;
}

export function difference<T>(setA: Set<T>, setB: Set<T>) {
  const _difference = new Set(setA);

  for (const elem of setB) {
    _difference.delete(elem);
  }

  return _difference;
}
