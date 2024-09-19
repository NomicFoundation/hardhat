import fs from "node:fs";

import { keccak256 } from "../src/internal/util/keccak";

function capitalize(s: string): string {
  return s.length === 0 ? "" : s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generates all permutations of the given length and number of different
 * elements as an iterator of 0-based indices.
 */
function* genPermutations(elemCount: number, len: number) {
  // We can think of a permutation as a number of base `elemCount`, i.e.
  // each 'digit' is a number between 0 and `elemCount - 1`.
  // Then, to generate all permutations, we simply need to linearly iterate
  // from 0 to max number of permutations (elemCount ** len) and convert
  // each number to a list of digits as per the base `elemCount`, see above.
  const numberOfPermutations = elemCount ** len;
  const dividers = Array(elemCount)
    .fill(0)
    .map((_, i) => elemCount ** i);

  for (let number = 0; number < numberOfPermutations; number++) {
    const params = Array(len)
      .fill(0)
      .map((_, i) => Math.floor(number / dividers[i]) % elemCount);
    // Reverse, so that we keep the natural big-endian ordering, i.e.
    // [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], ...
    params.reverse();

    yield params;
  }
}

type TypeName = { type: string; modifier?: "memory" };
type FnParam = TypeName & { name: string };

/** Computes the function selector for the given function with simple arguments. */
function selector({ name = "", params = [] as TypeName[] }) {
  const sigParams = params.map((p) => p.type).join(",");
  return keccak256(Buffer.from(`${name}(${sigParams})`)).slice(0, 4);
}

function toHex(value: Uint8Array) {
  return "0x" + Buffer.from(value).toString("hex");
}

/** The types for which we generate `logUint`, `logString`, etc. */
const SINGLE_TYPES = [
  { type: "int256" },
  { type: "uint256" },
  { type: "string", modifier: "memory" },
  { type: "bool" },
  { type: "address" },
  { type: "bytes", modifier: "memory" },
  ...Array.from({ length: 32 }, (_, i) => ({ type: `bytes${i + 1}` })),
] as const;

/** The types for which we generate a `log` function with all possible
 combinations of up to 4 arguments. */
const TYPES = [
  { type: "uint256" },
  { type: "string", modifier: "memory" },
  { type: "bool" },
  { type: "address" },
] as const;

/** A list of `console.log*` functions that we want to generate. */
const CONSOLE_LOG_FUNCTIONS =
  // Basic `log()` function
  [{ name: "log", params: [] as FnParam[] }]
    // Generate single parameter functions that are type-suffixed for
    // backwards-compatibility, e.g. logInt, logUint, logString, etc.
    .concat(
      SINGLE_TYPES.map((single) => {
        const param = { ...single, name: "p0" };
        const nameSuffix = capitalize(param.type.replace("int256", "int"));

        return {
          name: `log${nameSuffix}`,
          params: [param],
        };
      })
    )
    // Also generate the function definitions for `log` for permutations of
    // up to 4 parameters using the `types` (uint256, string, bool, address).
    .concat(
      [...Array(4)].flatMap((_, paramCount) => {
        return Array.from(
          genPermutations(TYPES.length, paramCount + 1),
          (permutation) => ({
            name: "log",
            params: permutation.map((typeIndex, i) => ({
              ...TYPES[typeIndex],
              name: `p${i}`,
            })),
          })
        );
      })
    );

/** Maps from a 4-byte function selector to a signature (argument types) */
const CONSOLE_LOG_SIGNATURES = Object.fromEntries(
  CONSOLE_LOG_FUNCTIONS.map(({ params }) => {
    // We always use "log" for the selector, even if it's logUint, for example.
    const signature = toHex(selector({ name: "log", params }));
    const types = params.map((p) => p.type);

    return [signature, types];
  })
);

// Finally, render and save the console.sol and logger.ts files
const consoleSolFile = `\
// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library console {
    address constant CONSOLE_ADDRESS =
        0x000000000000000000636F6e736F6c652e6c6f67;

    function _sendLogPayloadImplementation(bytes memory payload) internal view {
        address consoleAddress = CONSOLE_ADDRESS;
        /// @solidity memory-safe-assembly
        assembly {
            pop(
                staticcall(
                    gas(),
                    consoleAddress,
                    add(payload, 32),
                    mload(payload),
                    0,
                    0
                )
            )
        }
    }

    function _castToPure(
      function(bytes memory) internal view fnIn
    ) internal pure returns (function(bytes memory) pure fnOut) {
        assembly {
            fnOut := fnIn
        }
    }

    function _sendLogPayload(bytes memory payload) internal pure {
        _castToPure(_sendLogPayloadImplementation)(payload);
    }

${CONSOLE_LOG_FUNCTIONS.map(({ name, params }) => {
  let fnParams = params
    .map((p) => `${p.type}${p.modifier ? ` ${p.modifier}` : ""} ${p.name}`)
    .join(", ");
  let sig = params.map((p) => p.type).join(",");
  let passed = params.map((p) => p.name).join(", ");
  let passedArgs = passed.length > 0 ? `, ${passed}` : "";

  return `\
    function ${name}(${fnParams}) internal pure {
        _sendLogPayload(abi.encodeWithSignature("log(${sig})"${passedArgs}));
    }
`;
}).join("\n")}\
}
`;

const loggerFile = `\
// ------------------------------------
// This code was autogenerated using
// scripts/console-library-generator.ts
// ------------------------------------

${Array.from(SINGLE_TYPES.map((param) => capitalize(param.type)))
  .map((type) => `export const ${type}Ty = "${type}";`)
  .join("\n")}

/** Maps from a 4-byte function selector to a signature (argument types) */
export const CONSOLE_LOG_SIGNATURES: Record<number, string[]> = {
${Object.entries(CONSOLE_LOG_SIGNATURES)
  .map(([sig, types]) => {
    const typeNames = types.map((type) => `${capitalize(type)}Ty`).join(", ");
    return `  ${sig}: [${typeNames}],`;
  })
  .join("\n")}
};
`;

fs.writeFileSync(__dirname + "/../console.sol", consoleSolFile);
fs.writeFileSync(
  __dirname + "/../src/internal/hardhat-network/stack-traces/logger.ts",
  loggerFile
);
