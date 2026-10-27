import type { UtilsTaskDefinition } from "../../types.js";

import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

const JSON_VALUES_HINT =
  'Arrays and tuples are JSON, with addresses, hex and strings quoted, like [1,"0x..."]. Put -- before a negative number';

export function abi(prefix: string[]): UtilsTaskDefinition[] {
  const abiTask = emptyTask(
    [...prefix, "abi"],
    "Work with ABI signatures and data",
  ).build();

  const encodeArgsTask = buildUtilsTask(
    task(
      [...prefix, "abi", "encode-args"],
      "ABI-encode values for a signature, without its selector",
    )
      .addPositionalArgument({
        name: "signature",
        description:
          'The signature, like "transfer(address,uint256)" or "(address,uint256)"',
      })
      .addVariadicArgument({
        name: "values",
        description: `The values to encode, in order. ${JSON_VALUES_HINT}`,
        defaultValue: [],
      }),
    async () => await import("./encode-args.js"),
  );

  const encodeCalldataTask = buildUtilsTask(
    task(
      [...prefix, "abi", "encode-calldata"],
      "ABI-encode a function call: its selector followed by its values",
    )
      .addPositionalArgument({
        name: "signature",
        description: 'The function signature, like "transfer(address,uint256)"',
      })
      .addVariadicArgument({
        name: "values",
        description: `The values to encode, in order. ${JSON_VALUES_HINT}`,
        defaultValue: [],
      }),
    async () => await import("./encode-calldata.js"),
  );

  const encodeTypeTask = buildUtilsTask(
    task(
      [...prefix, "abi", "encode-type"],
      "ABI-encode a single value of a given type",
    )
      .addPositionalArgument({
        name: "type",
        description: "The type, like uint256, int128 or address[]",
      })
      .addPositionalArgument({
        name: "value",
        description: `The value to encode. ${JSON_VALUES_HINT}`,
      }),
    async () => await import("./encode-type.js"),
  );

  const sigTask = buildUtilsTask(
    task(
      [...prefix, "abi", "sig"],
      "Print the 4-byte selector of a function or error signature",
    ).addPositionalArgument({
      name: "signature",
      description: 'The signature, like "transfer(address,uint256)"',
    }),
    async () => await import("./sig.js"),
  );

  const sigEventTask = buildUtilsTask(
    task(
      [...prefix, "abi", "sig-event"],
      "Print the 32-byte topic of an event signature",
    ).addPositionalArgument({
      name: "signature",
      description: 'The signature, like "Transfer(address,address,uint256)"',
    }),
    async () => await import("./sig-event.js"),
  );

  return [
    abiTask,
    encodeArgsTask,
    encodeCalldataTask,
    encodeTypeTask,
    sigTask,
    sigEventTask,
  ];
  return [abiTask, sigTask, sigEventTask];
}
