#!/usr/bin/env node
import debug from "debug";
import * as fs from "fs";
import * as path from "path";
import semver from "semver";

const tabtab = require("@fvictorio/tabtab");

const log = debug("hh");

const REQUIRED_HARDHAT_VERSION_RANGE = ">=2.0.7";

export async function main() {
  const cmd = process.argv[2];

  if (cmd === "install") {
    await tabtab
      .install({
        name: "hh",
        completer: "hardhat-completion",
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
    let pathToHardhatPackageJson: string;

    try {
      pathToHardhatPackageJson = require.resolve("hardhat/package.json", {
        paths: [process.cwd()],
      });
    } catch {
      // not inside a hardhat project
      return;
    }

    try {
      const env = tabtab.parseEnv(process.env);

      // check hh's dependency on hardhat
      const hardhatVersion = require(pathToHardhatPackageJson).version;
      const pathToHardhatAutocomplete = getRequirePathFromCwd(
        "hardhat/internal/cli/autocomplete"
      );

      if (
        !semver.satisfies(hardhatVersion, REQUIRED_HARDHAT_VERSION_RANGE) ||
        pathToHardhatAutocomplete === null
      ) {
        await logWarningWithThrottling(
          `\nCouldn't get autocomplete for this project. The installed version of hh requires a hardhat version that satisfies ${REQUIRED_HARDHAT_VERSION_RANGE}, but this project uses ${hardhatVersion}`
        );
        return;
      }

      // check hardhat's dependency on hh
      const hhVersion = require("../../package.json").version;

      const {
        complete,
        HARDHAT_COMPLETE_FILES,
        REQUIRED_HH_VERSION_RANGE,
      } = require(pathToHardhatAutocomplete);

      if (!semver.satisfies(hhVersion, REQUIRED_HH_VERSION_RANGE)) {
        await logWarningWithThrottling(
          `\nCouldn't get autocomplete for this project. The version of hardhat used in this project requires an hh version that satisfies ${REQUIRED_HH_VERSION_RANGE}, but your version of hh is ${hhVersion}`
        );
        return;
      }

      // get and print suggestions
      const suggestions = await complete(env);

      if (Array.isArray(suggestions)) {
        return tabtab.log(suggestions);
      }

      if (suggestions === HARDHAT_COMPLETE_FILES) {
        return tabtab.logFiles();
      }

      console.error(
        "\nCouldn't complete the command, please report this issue"
      );
      return tabtab.log([]);
    } catch (e) {
      if (e instanceof Error) {
        log(e.message);
      }
      return tabtab.log([]);
    }
  }

  console.error(
    `Unrecognized command "${cmd}". You can install Hardhat completion with the "install" command.`
  );
  process.exit(1);
}

async function logWarningWithThrottling(message: string) {
  // we need to write a file to disk to do the throttling because zsh calls the
  // autocomplete function several times, and these are separate processes
  const pathToGlobalDirModule = getRequirePathFromCwd(
    "hardhat/internal/util/global-dir"
  )!; // we know it exists because otherwise we would've exited earlier

  const { getCacheDir } = require(pathToGlobalDirModule);

  const globalCacheDir = await getCacheDir();
  const throttleFile = path.join(globalCacheDir, ".hh-throttle-file");

  if (fs.existsSync(throttleFile) && fileAge(throttleFile) < 5000) {
    // if the throttle file is recent, we don't do anything
    return;
  }

  console.warn(message);
  fs.writeFileSync(throttleFile, "");
}

function fileAge(file: string): number {
  const stats = fs.statSync(file);
  return Date.now() - stats.mtimeMs;
}

function getRequirePathFromCwd(moduleToRequire: string): string | null {
  try {
    const pathToRequire = require.resolve(moduleToRequire, {
      paths: [process.cwd()],
    });
    return pathToRequire;
  } catch {
    return null;
  }
}

main()
  .then(() => process.exit(process.exitCode))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
