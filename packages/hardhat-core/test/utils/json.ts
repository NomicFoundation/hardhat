import { assert } from "chai";
import fs from "fs";

export function assertValidJson(pathToJson: string) {
  const content = fs.readFileSync(pathToJson).toString();

  try {
    JSON.parse(content);
  } catch (e) {
    assert.fail(`Invalid json file: ${pathToJson}`);
  }
}
