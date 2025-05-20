import type { NewTaskDefinitionBuilder } from "hardhat/types/tasks";

import { ArgumentType } from "hardhat/types/arguments";

export function extendWithVerificationArgs(
  task: NewTaskDefinitionBuilder,
): NewTaskDefinitionBuilder {
  return task
    .addPositionalArgument({
      name: "address",
      description: "The address of the contract to verify",
    })
    .addOption({
      name: "constructorArgsPath",
      type: ArgumentType.FILE_WITHOUT_DEFAULT,
      description:
        "A relative path to a module that exports the constructor arguments",
      defaultValue: undefined,
    })
    .addVariadicArgument({
      name: "constructorArgs",
      description: "The constructor arguments",
      defaultValue: [],
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
    .addFlag({
      name: "listNetworks",
      description: "List the networks that are supported by Etherscan",
    });
}
