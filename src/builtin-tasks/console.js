const importLazy = require("import-lazy")(require);
const path = require("path");
const fs = importLazy("fs-extra");
const repl = require("repl");
const replHistory = require("repl.history");

task("console", "Opens a buidler console")
  .addFlag("noCompile", "Don't compile before running this task")
  .setAction(async ({ noCompile }) => {
    if (!noCompile) {
      await run("compile");
    }

    await fs.ensureDir(config.paths.cache);
    const historyFile = path.join(config.paths.cache, "console_history");

    const theRepl = repl.start({ useGlobal: true, ignoreUndefined: true });

    replHistory(theRepl, historyFile);
  });
