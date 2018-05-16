const importLazy = require("import-lazy")(require);
const fs = importLazy("fs-extra");

task("clean", "Clears the cache and deletes all artifacts", async () => {
  await fs.remove(config.paths.cache);
  await fs.remove(config.paths.artifacts);
});
