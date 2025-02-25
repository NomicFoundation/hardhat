/* eslint-disable dot-notation,@typescript-eslint/dot-notation */
import { Common } from "@ethereumjs/common";

export async function retrieveCommon(provider: any): Promise<Common> {
  return provider["_common"];
}
