const path = require("path");
const glob = require("glob");

const pattern = path.join(__dirname, "..", "..", "builtin-tasks", "*.js");

glob
  .sync(pattern)
  .sort()
  .forEach((f: string) => require(f));
