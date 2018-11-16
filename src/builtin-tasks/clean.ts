import { task, config } from "../types";

task("clean", "Clears the cache and deletes all artifacts", async () => {
  const fs = await import("fs-extra");
  await fs.remove(config.paths.cache);
  await fs.remove(config.paths.artifacts);
});
