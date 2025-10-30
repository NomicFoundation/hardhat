import type { VerifyActionArgs } from "./types.js";
import type { NewTaskDefinitionBuilder } from "hardhat/types/tasks";

import { ArgumentType } from "hardhat/types/arguments";

export function extendWithVerificationArgs(
  task: NewTaskDefinitionBuilder,
): NewTaskDefinitionBuilder<VerifyActionArgs> {
  return task
    .addPositionalArgument({
      name: "address",
      description: "The address of the contract to verify",
    })
    .addVariadicArgument({
      name: "constructorArgs",
      description: "The constructor arguments",
      defaultValue: [],
    })
    .addOption({
      name: "constructorArgsPath",
      type: ArgumentType.FILE_WITHOUT_DEFAULT,
      description:
        "A relative path to a module that exports the constructor arguments",
      defaultValue: undefined,
    })
    .addOption({
      name: "contract",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      description:
        "The name of the contract to verify, in the format <path>:<contractName>",
      defaultValue: undefined,
    })
    .addOption({
      name: "librariesPath",
      type: ArgumentType.FILE_WITHOUT_DEFAULT,
      description:
        "A relative path to a module that exports a mapping of library names to addresses",
      defaultValue: undefined,
    })
    .addFlag({
      name: "force",
      description:
        "Force the verification even if the contract is already verified",
    })
    .addOption({
      name: "creationTxHash",
      type: ArgumentType.STRING_WITHOUT_DEFAULT,
      description:
        "The hash of the contract creation transaction (optional, used by Sourcify)",
      defaultValue: undefined,
    });
  /* TODO: M5
    .addFlag({
      name: "listNetworks",
      description: "List the networks that are supported by Etherscan",
    });
  */
}
