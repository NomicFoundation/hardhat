import path from "path";
import { globSync } from "../../util/glob";

const pattern = path.join(__dirname, "..", "..", "builtin-tasks", "*.js");

globSync(pattern)
  .sort()
  .forEach((f: string) => require(f));
