declare module "ethereumjs-abi" {
  export function methodID(name: string, types: string[]): Buffer;
  export function rawDecode(types: string[], data: Buffer): any[];
}
