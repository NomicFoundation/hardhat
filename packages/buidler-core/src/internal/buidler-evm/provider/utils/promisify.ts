import { promisify as nodePromisify } from "util";

import { Callback } from "../types/Callback";

export const promisify: typeof myPromisify = nodePromisify;

declare function myPromisify<ResultT>(
  fn: (cb: Callback<ResultT>) => void
): () => Promise<ResultT>;
declare function myPromisify<Arg1T, ResultT>(
  fn: (arg1: Arg1T, cb: Callback<ResultT>) => void
): (arg1: Arg1T) => Promise<ResultT>;
declare function myPromisify<Arg1T, Arg2T, ResultT>(
  fn: (arg1: Arg1T, arg2: Arg2T, cb: Callback<ResultT>) => void
): (arg1: Arg1T, arg2: Arg2T) => Promise<ResultT>;
declare function myPromisify<Arg1T, Arg2T, Arg3T, ResultT>(
  fn: (arg1: Arg1T, arg2: Arg2T, arg3: Arg3T, cb: Callback<ResultT>) => void
): (arg1: Arg1T, arg2: Arg2T, arg3: Arg3T) => Promise<ResultT>;
