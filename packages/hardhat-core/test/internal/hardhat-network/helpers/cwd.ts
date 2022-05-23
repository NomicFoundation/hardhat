import path from 'node:path';
import process from "process";

export function setCWD() {
  let previousWD: string;
  before("Setting CWD", function () {
    previousWD = process.cwd();
    process.chdir(path.join(__dirname, ".."));
  });

  after("Restoring CWD", function () {
    process.chdir(previousWD);
  });
}
