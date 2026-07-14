// cSpell:ignore ABCAB ABCA BCAB
import type * as StreamParserJson from "@streamparser/json-node";
import type { Readable } from "node:stream";

import { pipeline } from "node:stream/promises";

// We don't load @streamparser/json-node on startup because it's only
// used for parsing very large JSON payloads.
let streamParserJson: typeof StreamParserJson | undefined;

/**
 * Parses a stream of UTF-8 encoded JSON bytes and returns the parsed value.
 * This should be used when parsing very large JSON payloads.
 *
 * @param stream The stream of UTF-8 encoded JSON bytes.
 * @returns The parsed JSON value.
 */
export async function parseJsonStream<T>(stream: Readable): Promise<T> {
  if (streamParserJson === undefined) {
    streamParserJson = await import("@streamparser/json-node");
  }

  // NOTE: We set a separator to disable self-closing to be able to use the parser
  // in the stream.pipeline context; see https://github.com/juanjoDiaz/streamparser-json/issues/47
  const jsonParser = new streamParserJson.JSONParser({
    separator: "",
  });

  const result: T | undefined = await pipeline(
    stream,
    jsonParser,
    async (
      elements: AsyncIterable<StreamParserJson.ParsedElementInfo.ParsedElementInfo>,
    ): Promise<any | undefined> => {
      let value:
        | StreamParserJson.JsonTypes.JsonPrimitive
        | StreamParserJson.JsonTypes.JsonStruct
        | undefined;
      for await (const element of elements) {
        value = element.value;
      }
      return value;
    },
  );

  if (result === undefined) {
    throw new Error("No data");
  }

  return result;
}

/**
 * Builds the LPS (Longest Prefix Suffix) table used by the Knuth-Morris-Pratt
 * string search algorithm. For each index `i` in the pattern, `lps[i]` holds
 * the length of the longest prefix of `pattern[0..i]` that is also a suffix
 * of that substring.
 *
 * For example, given the pattern `ABCABD`, the substring at index 4 is
 * `ABCAB`. Its prefixes include `A`, `AB`, `ABC`, `ABCA` and its suffixes
 * include `B`, `AB`, `CAB`, `BCAB`. The longest prefix that is also a
 * suffix is `AB` (length 2), so `lps[4] = 2`.
 *
 * @param pattern The pattern to build the table for.
 * @returns An array where entry `i` is the LPS length for `pattern[0..i]`.
 */
export function buildLpsTable(pattern: Uint8Array): number[] {
  const lps = new Array(pattern.length).fill(0);
  let matchLen = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[matchLen]) {
      lps[i++] = ++matchLen;
    } else if (matchLen > 0) {
      matchLen = lps[matchLen - 1];
    } else {
      lps[i++] = 0;
    }
  }

  return lps;
}
