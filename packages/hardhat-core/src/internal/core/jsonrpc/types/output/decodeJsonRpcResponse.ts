import * as t from "io-ts";

import { InvalidResponseError } from "../../../providers/errors";

/**
 * This function decodes an RPC out type, throwing InvalidResponseError if it's not valid.
 */
export function decodeJsonRpcResponse<T>(value: unknown, codec: t.Type<T>) {
  return codec.decode(value).fold(() => {
    // tslint:disable-next-line
    throw new InvalidResponseError(
      `Invalid JSON-RPC response. Expected: ${codec.name}`
    );
  }, t.identity);
}
