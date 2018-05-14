const fs = require("fs-extra");

task("clean", "Clears the cache and deletes all artifacts", async () => {
  await fs.remove(config.paths.cache);
  await fs.remove(config.paths.artifacts);
});
