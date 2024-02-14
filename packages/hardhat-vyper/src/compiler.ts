import { exec } from "child_process";
import { VyperSettings } from "./types";

export class Compiler {
  constructor(private _pathToVyper: string) {}

  /**
   *
   * @param inputPaths array of paths to contracts to be compiled
   */
  public async compile(inputPaths: string[], settings: VyperSettings = {}) {
    const output: string = await new Promise((resolve, reject) => {
      let settingsStr =
        settings.evmVersion !== undefined
          ? `--evm-version ${settings.evmVersion} `
          : "";
      settingsStr +=
        settings.optimize !== undefined
          ? `--optimize ${String(settings.optimize)} `
          : "";

      const process = exec(
        `${this._pathToVyper} ${settingsStr} -f combined_json ${inputPaths.join(
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
