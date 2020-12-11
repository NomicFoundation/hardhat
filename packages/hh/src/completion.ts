#!/usr/bin/env node
import tabtab from "@fvictorio/tabtab";

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
      const {
        complete,
        HARDHAT_COMPLETE_FILES,
      } = require(pathToHardhatAutocomplete);
      const suggestions = await complete(env);

      if (Array.isArray(suggestions)) {
        return tabtab.log(suggestions);
      }

      if (suggestions === HARDHAT_COMPLETE_FILES) {
        return tabtab.logFiles();
      }

      console.error("Couldn't complete the command, please report this issue");
      return tabtab.log([]);
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
