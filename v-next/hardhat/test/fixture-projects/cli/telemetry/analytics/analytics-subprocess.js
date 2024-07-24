// This file will be copied to the "analytics" folder so it will be executed as a subprocess.
// This will allow checking that the subprocess received the correct payload.

// We need to directly use the node method "fs" instead of "writeJsonFile" because a TypeScript ESM file cannot be imported without compiling it first
import { writeFileSync } from "node:fs";
import path from "node:path";

const PATH_TO_RESULT_FILE = path.join(
  process.cwd(),
  "test",
  "fixture-projects",
  "cli",
  "telemetry",
  "analytics",
  "result.json",
);

(() => {
  const stringifiedPayload = process.argv[2];

  writeFileSync(PATH_TO_RESULT_FILE, stringifiedPayload);
})();
