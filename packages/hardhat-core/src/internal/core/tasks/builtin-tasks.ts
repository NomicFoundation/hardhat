import path from "path";

import { globSync } from "../../util/glob";

globSync(path.join(__dirname, "../../../builtin-tasks/*"))
  .filter((p) => p.endsWith(".ts") || p.endsWith(".js"))
  .forEach(require);
