/**
 * This function resets the buidler context.
 *
 * This doesn't unload any loaded Buidler plugin, so those have to be unloaded
 * manually with `unloadModule`.
 */
import { BuidlerContext } from "./context";
import { getUserConfigPath } from "./core/project-structure";
import { globSync } from "./util/glob";

export function resetBuidlerContext() {
  if (BuidlerContext.isCreated()) {
    const ctx = BuidlerContext.getBuidlerContext();
    const globalAsAny = global as any;
    if (ctx.environment !== undefined) {
      for (const key of Object.keys(ctx.environment)) {
        globalAsAny[key] = undefined;
      }
      // unload config file too.
      unloadModule(ctx.environment.config.paths.configFile);
    } else {
      // We may get here if loading the config has thrown, so be unload it
      let configPath: string | undefined;

      try {
        configPath = getUserConfigPath();
      } catch (error) {
        // We weren't in a buidler project
      }

      if (configPath !== undefined) {
        unloadModule(configPath);
      }
    }
    BuidlerContext.deleteBuidlerContext();
  }

  // Unload all the buidler's entry-points.
  unloadModule("../register");
  unloadModule("./cli/cli");
  unloadModule("./lib/buidler-lib");
}

function unloadModule(path: string) {
  try {
    delete require.cache[require.resolve(path)];
  } catch (err) {
    // module wasn't loaded
  }
}
