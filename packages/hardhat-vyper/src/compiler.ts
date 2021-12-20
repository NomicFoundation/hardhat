import { exec } from "child_process";

export class Compiler {
  constructor(private _pathToVyper: string) {}

  /**
   *
   * @param inputPaths array of paths to contracts to be compiled
   */
  public async compile(inputPaths: string[]) {
    const output: string = await new Promise((resolve, reject) => {
      const process = exec(
        `${this._pathToVyper} -f combined_json ${inputPaths.join(" ")}`,
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
