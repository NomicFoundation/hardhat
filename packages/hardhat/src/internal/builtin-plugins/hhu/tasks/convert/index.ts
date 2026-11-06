import type { UtilsTaskDefinition } from "../../types.js";

import { ArgumentType } from "../../../../../types/arguments.js";
import { emptyTask, task } from "../../../../core/config.js";
import { buildUtilsTask } from "../utils-task.js";

export function convert(prefix: string[]): UtilsTaskDefinition[] {
  const convertTask = emptyTask(
    [...prefix, "convert"],
    "Convert values between common Ethereum representations",
  ).build();

  const formatUnitsTask = buildUtilsTask(
    task(
      [...prefix, "convert", "format-units"],
      "Format an integer as a decimal amount with the given number of decimals",
    )
      .addPositionalArgument({
        name: "value",
        description: "The integer to format, in decimal or 0x-hex",
        type: ArgumentType.BIGINT,
      })
      .addPositionalArgument({
        name: "decimals",
        description: "The number of decimals",
        type: ArgumentType.INT,
        defaultValue: 18,
      }),
    async () => await import("./format-units.js"),
  );

  const fromHexTask = buildUtilsTask(
    task(
      [...prefix, "convert", "from-hex"],
      "Convert a hex value to a decimal integer",
    ).addPositionalArgument({
      name: "value",
      description: "The hex value to convert, with or without the 0x prefix",
    }),
    async () => await import("./from-hex.js"),
  );

  const fromWeiTask = buildUtilsTask(
    task(
      [...prefix, "convert", "from-wei"],
      "Convert an amount of wei to ether, gwei or wei",
    )
      .addPositionalArgument({
        name: "value",
        description: "The amount of wei to convert, in decimal or 0x-hex",
        type: ArgumentType.BIGINT,
      })
      .addPositionalArgument({
        name: "unit",
        description: "The unit to convert to: ether, gwei or wei",
        defaultValue: "ether",
      }),
    async () => await import("./from-wei.js"),
  );

  const padTask = buildUtilsTask(
    task(
      [...prefix, "convert", "pad"],
      "Pad a hex string to a given byte length",
    )
      .addPositionalArgument({
        name: "value",
        description: "The hex string to pad",
      })
      .addOption({
        name: "length",
        description: "The target length, in bytes",
        type: ArgumentType.INT,
        defaultValue: 32,
      })
      .addFlag({
        name: "left",
        description: "Pad to the left (default)",
      })
      .addFlag({
        name: "right",
        description: "Pad to the right",
      }),
    async () => await import("./pad.js"),
  );

  const parseUnitsTask = buildUtilsTask(
    task(
      [...prefix, "convert", "parse-units"],
      "Parse a decimal amount into an integer with the given number of decimals",
    )
      .addPositionalArgument({
        name: "value",
        description: "The decimal amount to parse, like 1.5",
      })
      .addPositionalArgument({
        name: "decimals",
        description: "The number of decimals",
        type: ArgumentType.INT,
        defaultValue: 18,
      }),
    async () => await import("./parse-units.js"),
  );

  const toChecksumAddressTask = buildUtilsTask(
    task(
      [...prefix, "convert", "to-checksum-address"],
      "Convert an address to its EIP-55 checksummed representation",
    ).addPositionalArgument({
      name: "address",
      description: "The address to convert",
    }),
    async () => await import("./to-checksum-address.js"),
  );

  const toHexTask = buildUtilsTask(
    task(
      [...prefix, "convert", "to-hex"],
      "Convert a non-negative integer to hex",
    ).addPositionalArgument({
      name: "value",
      description: "The integer to convert, in decimal or 0x-hex",
      type: ArgumentType.BIGINT,
    }),
    async () => await import("./to-hex.js"),
  );

  const toWeiTask = buildUtilsTask(
    task(
      [...prefix, "convert", "to-wei"],
      "Convert an amount of ether, gwei or wei to wei",
    )
      .addPositionalArgument({
        name: "value",
        description: "The amount to convert, like 1.5",
      })
      .addPositionalArgument({
        name: "unit",
        description: "The unit of the amount: ether, gwei or wei",
        defaultValue: "ether",
      }),
    async () => await import("./to-wei.js"),
  );

  return [
    convertTask,
    formatUnitsTask,
    fromHexTask,
    fromWeiTask,
    padTask,
    parseUnitsTask,
    toChecksumAddressTask,
    toHexTask,
    toWeiTask,
  ];
}
