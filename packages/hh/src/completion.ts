#!/usr/bin/env node
import tabtab from "@pnpm/tabtab";

export async function main() {
  const cmd = process.argv[2];

  if (cmd === "install") {
    await tabtab
      .install({
        name: "hh",
        completer: "hh-completion",
      })
      .catch((err: any) => {
        console.error(
          "There was a problem installing Hardhat's completion",
          err
        );
      });

    return;
  }

  if (cmd === "completion") {
    const env = tabtab.parseEnv(process.env);
    try {
      const pathToHardhatAutocomplete = require.resolve(
        "hardhat/internal/cli/autocomplete",
        {
          paths: [process.cwd()],
        }
      );
      const { complete } = require(pathToHardhatAutocomplete);
      const suggestions = await complete(env);
      return tabtab.log(suggestions);
    } catch (e) {
      return tabtab.log([]);
    }
  }

  console.error(
    `Unrecognized command "${cmd}". You can install Hardhat completion with the "install" command.`
  );
  process.exit(1);
}

main()
  .then(() => process.exit(process.exitCode))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
