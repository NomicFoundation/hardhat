import { exec } from "child_process";
import semver from "semver";
import { VyperSettings } from "./types";
import { VyperPluginError } from "./util";

export class Compiler {
  constructor(private _pathToVyper: string) {}

  /**
   *
   * @param inputPaths array of paths to contracts to be compiled
   * @param compilerVersion the version of the Vyper compiler
   * @param settings the Vyper settings to use during compilation
   */
  public async compile(
    inputPaths: string[],
    compilerVersion: string = "",
    settings: VyperSettings = {}
  ) {
    const output: string = await new Promise((resolve, reject) => {
      const settingsCmd = getSettingsCmd(compilerVersion, settings);

      const process = exec(
        `${this._pathToVyper} ${settingsCmd} -f combined_json ${inputPaths.join(
          " "
        )}`,
        {
          maxBuffer: 1024 * 1024 * 500,
        },
        (err, stdout) => {
          if (err !== null) {
            return reject(err);
          }
          resolve(stdout);
        }
      );

      process.stdin!.end();
    });

    return JSON.parse(output);
  }
}

function getSettingsCmd(
  compilerVersion: string,
  settings: VyperSettings
): string {
  let settingsStr =
    settings.evmVersion !== undefined
      ? `--evm-version ${settings.evmVersion} `
      : "";

  settingsStr += getOptimize(compilerVersion, settings.optimize);

  return settingsStr;
}

function getOptimize(
  compilerVersion: string,
  optimize: string | boolean | undefined
): string {
  if (optimize === undefined) {
    return "";
  }

  if (compilerVersion === "") {
    throw new VyperPluginError(
      "The 'compilerVersion' parameter must be set when the setting 'optimize' is set."
    );
  }

  if (typeof optimize === "boolean") {
    if (semver.lte(compilerVersion, "0.3.0")) {
      throw new VyperPluginError(
        `The 'optimize' setting is not supported for Vyper versions <= 0.3.0. You are using ${compilerVersion}.`
      );
    }
  
    if (optimize && semver.gte(compilerVersion, "0.3.10")) {
      throw new VyperPluginError(
        `The 'optimize' setting with 'true' is not supported for Vyper >= 0.3.10. You are using ${compilerVersion}.`
      );
    }
  
    return optimize ? "" : semver.lt(compilerVersion, "0.3.10") ? "--no-optimize" : "--optimize none";
  }
  

  if (typeof optimize === "string") {
    if (semver.gte(compilerVersion, "0.3.10")) {
      return `--optimize ${optimize}`;
    }

    throw new VyperPluginError(
      `The 'optimize' setting, when specified as a string value, is available only starting from the Vyper compiler version 0.3.10. You are currently using version ${compilerVersion}.`
    );
  }

  throw new VyperPluginError(
    `The 'optimize' setting has an invalid type value: ${typeof optimize}. Type should be either string or boolean.`
  );
}
