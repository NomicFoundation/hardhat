const util = require("util");
const rimraf = util.promisify(require("rimraf"));

task("clean", "Clears the cache and deletes all artifacts", async () => {
  await rimraf(config.paths.cache);
  await rimraf(config.paths.artifacts);
});
