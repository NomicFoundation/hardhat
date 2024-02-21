/* eslint-disable dot-notation,@typescript-eslint/dot-notation */
import { Common } from "@nomicfoundation/ethereumjs-common";

export async function retrieveCommon(provider: any): Promise<Common> {
  return provider["_common"];
}
