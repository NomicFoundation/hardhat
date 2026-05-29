import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { bytesToUtf8String } from "@nomicfoundation/hardhat-utils/bytes";

export interface SolidityBuildInfoOutputForSolidityTests {
  output: {
    sources: Record<string, { ast: any }>;
    contracts?: Record<
      string,
      Record<string, { evm?: { methodIdentifiers?: Record<string, string> } }>
    >;
  };
}

/**
 * Parses the parts of a build-info output needed by Solidity Test without
 * decoding the entire JSON payload into a single string.
 *
 * Real projects can produce build-info outputs that are larger than V8's max
 * string length. The full output mostly consists of contract bytecode and
 * metadata, while Solidity Test only needs source ASTs and method identifiers.
 * This parser scans the JSON bytes and parses those smaller subtrees only.
 */
export function parseSolidityTestBuildInfoOutput(
  output: Uint8Array,
): SolidityBuildInfoOutputForSolidityTests {
  const rootRange = getValueRange(output, skipWhitespace(output, 0));
  const outputRange = findObjectPropertyRange(output, rootRange, "output");

  if (outputRange === undefined) {
    return { output: { sources: {} } };
  }

  const sourcesRange = findObjectPropertyRange(output, outputRange, "sources");
  const contractsRange = findObjectPropertyRange(
    output,
    outputRange,
    "contracts",
  );

  const parsedOutput: SolidityBuildInfoOutputForSolidityTests = {
    output: {
      sources:
        sourcesRange !== undefined ? parseSources(output, sourcesRange) : {},
      contracts:
        contractsRange !== undefined
          ? parseContractsMethodIdentifiers(output, contractsRange)
          : undefined,
    },
  };

  return parsedOutput;
}

function parseSources(
  bytes: Uint8Array,
  sourcesRange: ValueRange,
): NonNullable<SolidityBuildInfoOutputForSolidityTests["output"]["sources"]> {
  const sources: NonNullable<
    SolidityBuildInfoOutputForSolidityTests["output"]["sources"]
  > = {};

  for (const { key, valueRange } of iterateObjectProperties(
    bytes,
    sourcesRange,
  )) {
    sources[key] = parseJsonRange(bytes, valueRange);
  }

  return sources;
}

function parseContractsMethodIdentifiers(
  bytes: Uint8Array,
  contractsRange: ValueRange,
): NonNullable<SolidityBuildInfoOutputForSolidityTests["output"]["contracts"]> {
  const contracts: NonNullable<
    SolidityBuildInfoOutputForSolidityTests["output"]["contracts"]
  > = {};

  for (const {
    key: sourceName,
    valueRange: sourceContractsRange,
  } of iterateObjectProperties(bytes, contractsRange)) {
    const parsedContracts: NonNullable<
      SolidityBuildInfoOutputForSolidityTests["output"]["contracts"]
    >[string] = {};

    for (const {
      key: contractName,
      valueRange: contractRange,
    } of iterateObjectProperties(bytes, sourceContractsRange)) {
      const evmRange = findObjectPropertyRange(bytes, contractRange, "evm");
      const methodIdentifiersRange =
        evmRange !== undefined
          ? findObjectPropertyRange(bytes, evmRange, "methodIdentifiers")
          : undefined;

      parsedContracts[contractName] = {
        evm:
          methodIdentifiersRange !== undefined
            ? {
                methodIdentifiers: parseJsonRange(
                  bytes,
                  methodIdentifiersRange,
                ),
              }
            : undefined,
      };
    }

    contracts[sourceName] = parsedContracts;
  }

  return contracts;
}

interface ValueRange {
  start: number;
  end: number;
}

function findObjectPropertyRange(
  bytes: Uint8Array,
  objectRange: ValueRange,
  propertyName: string,
): ValueRange | undefined {
  for (const { key, valueRange } of iterateObjectProperties(
    bytes,
    objectRange,
  )) {
    if (key === propertyName) {
      return valueRange;
    }
  }

  return undefined;
}

function* iterateObjectProperties(
  bytes: Uint8Array,
  objectRange: ValueRange,
): Generator<{ key: string; valueRange: ValueRange }> {
  let cursor = skipWhitespace(bytes, objectRange.start);
  if (bytes[cursor] !== ASCII.LEFT_BRACE) {
    return;
  }

  cursor = skipWhitespace(bytes, cursor + 1);
  while (cursor < objectRange.end && bytes[cursor] !== ASCII.RIGHT_BRACE) {
    const keyRange = readStringRange(bytes, cursor);
    const key = parseJsonRange<string>(bytes, keyRange);

    cursor = skipWhitespace(bytes, keyRange.end);
    if (bytes[cursor] !== ASCII.COLON) {
      fail("Invalid JSON object: missing ':' after key");
    }

    const valueRange = getValueRange(bytes, skipWhitespace(bytes, cursor + 1));
    yield { key, valueRange };

    cursor = skipWhitespace(bytes, valueRange.end);
    if (bytes[cursor] === ASCII.COMMA) {
      cursor = skipWhitespace(bytes, cursor + 1);
    } else if (bytes[cursor] !== ASCII.RIGHT_BRACE) {
      fail("Invalid JSON object: missing ',' or '}'");
    }
  }
}

function getValueRange(bytes: Uint8Array, start: number): ValueRange {
  const firstByte = bytes[start];

  if (firstByte === ASCII.LEFT_BRACE) {
    return readCompositeRange(
      bytes,
      start,
      ASCII.LEFT_BRACE,
      ASCII.RIGHT_BRACE,
    );
  }

  if (firstByte === ASCII.LEFT_BRACKET) {
    return readCompositeRange(
      bytes,
      start,
      ASCII.LEFT_BRACKET,
      ASCII.RIGHT_BRACKET,
    );
  }

  if (firstByte === ASCII.DOUBLE_QUOTE) {
    return readStringRange(bytes, start);
  }

  let end = start;
  while (
    end < bytes.length &&
    bytes[end] !== ASCII.COMMA &&
    bytes[end] !== ASCII.RIGHT_BRACE &&
    bytes[end] !== ASCII.RIGHT_BRACKET &&
    !isWhitespace(bytes[end])
  ) {
    end += 1;
  }

  return { start, end };
}

function readCompositeRange(
  bytes: Uint8Array,
  start: number,
  left: number,
  right: number,
): ValueRange {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < bytes.length; i++) {
    const byte = bytes[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (byte === ASCII.BACKSLASH) {
        escaped = true;
      } else if (byte === ASCII.DOUBLE_QUOTE) {
        inString = false;
      }
      continue;
    }

    if (byte === ASCII.DOUBLE_QUOTE) {
      inString = true;
    } else if (byte === left) {
      depth += 1;
    } else if (byte === right) {
      depth -= 1;
      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }

  fail("Invalid JSON: unterminated composite value");
}

function readStringRange(bytes: Uint8Array, start: number): ValueRange {
  if (bytes[start] !== ASCII.DOUBLE_QUOTE) {
    fail("Invalid JSON: expected string");
  }

  let escaped = false;
  for (let i = start + 1; i < bytes.length; i++) {
    const byte = bytes[i];

    if (escaped) {
      escaped = false;
    } else if (byte === ASCII.BACKSLASH) {
      escaped = true;
    } else if (byte === ASCII.DOUBLE_QUOTE) {
      return { start, end: i + 1 };
    }
  }

  fail("Invalid JSON: unterminated string");
}

function fail(message: string): never {
  assertHardhatInvariant(false, message);
}

function parseJsonRange<T>(bytes: Uint8Array, range: ValueRange): T {
  return JSON.parse(bytesToUtf8String(bytes.subarray(range.start, range.end)));
}

function skipWhitespace(bytes: Uint8Array, start: number): number {
  let cursor = start;
  while (cursor < bytes.length && isWhitespace(bytes[cursor])) {
    cursor += 1;
  }

  return cursor;
}

function isWhitespace(byte: number): boolean {
  return (
    byte === ASCII.SPACE ||
    byte === ASCII.LINE_FEED ||
    byte === ASCII.CARRIAGE_RETURN ||
    byte === ASCII.TAB
  );
}

const ASCII = {
  BACKSLASH: 0x5c,
  COLON: 0x3a,
  COMMA: 0x2c,
  CARRIAGE_RETURN: 0x0d,
  DOUBLE_QUOTE: 0x22,
  LEFT_BRACE: 0x7b,
  LEFT_BRACKET: 0x5b,
  LINE_FEED: 0x0a,
  RIGHT_BRACE: 0x7d,
  RIGHT_BRACKET: 0x5d,
  SPACE: 0x20,
  TAB: 0x09,
} as const;
