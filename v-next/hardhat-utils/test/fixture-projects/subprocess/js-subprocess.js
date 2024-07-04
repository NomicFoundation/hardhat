// We need to directly use the node method "fs" instead of "writeJsonFile" because a TypeScript ESM file cannot be imported without compiling it first
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "tmp-file.json",
);

const subprocessInfo = {
  executed: false,
  arg1: "",
  arg2: "",
};

(() => {
  subprocessInfo.executed = true;
  subprocessInfo.arg1 = process.argv[2];
  subprocessInfo.arg2 = process.argv[3];

  writeFileSync(
    ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE,
    JSON.stringify(subprocessInfo),
  );
})();
