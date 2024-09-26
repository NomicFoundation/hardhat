// these helpers functions were copied from ethers

export async function resolveProperties<T>(value: {
  [P in keyof T]: T[P] | Promise<T[P]>;
}): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- keys is guaranteed to be an array of keys of T
  const keys = Object.keys(value) as Array<keyof T>;

  const results = await Promise.all(keys.map((k) => Promise.resolve(value[k])));

  return results.reduce((accum: any, v, index) => {
    accum[keys[index]] = v;
    return accum;
  }, {});
}
