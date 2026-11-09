import type { NewUtilsTaskActionFunction } from "../../types.js";

import { withConnection } from "../connection.js";

interface RpcActionArguments {
  method: string;
  params: string[];
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
TypeScript's lib doesn't declare JSON.rawJSON (Node 21+) yet */
const { rawJSON } = JSON as JSON & { rawJSON: (text: string) => unknown };

const rpcAction: NewUtilsTaskActionFunction<RpcActionArguments> = async (
  { method, params },
  hre,
) => {
  const result = await withConnection(
    hre,
    async (connection) =>
      await connection.provider.request({
        method,
        params: params.map(parseParam),
      }),
  );

  console.log(JSON.stringify(result));
};

// Like `cast rpc`, anything that isn't valid JSON is sent as a string, so
// values like 0x1 or latest don't need to be quoted as JSON strings.
function parseParam(param: string): unknown {
  try {
    // The reviver's third argument is the number's source text (Node 21+), so
    // integers beyond 2^53 are sent as written instead of rounded
    return JSON.parse(
      param,
      (_key, parsed: unknown, context?: { source?: string }) =>
        typeof parsed === "number" &&
        !Number.isSafeInteger(parsed) &&
        context?.source !== undefined
          ? rawJSON(context.source)
          : parsed,
    );
  } catch {
    return param;
  }
}

export default rpcAction;
