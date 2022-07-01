export function mapToAddress(x: any): any {
  if (typeof x === "string") {
    return x;
  }

  if (x === undefined || x === null) {
    return x;
  }

  if ((x as any).address) {
    return (x as any).address;
  }

  if (Array.isArray(x)) {
    return x.map(mapToAddress);
  }

  return x;
}
