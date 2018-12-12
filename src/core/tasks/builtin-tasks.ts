import path from "path";

import { globSync } from "../../util/glob";

const extension = __filename.endsWith(".js") ? "js" : "ts";

const pattern = path.join(
  __dirname,
  "..",
  "..",
  "builtin-tasks",
  "*." + extension
);

globSync(pattern)
  .sort()
  .forEach((f: string) => require(f));
