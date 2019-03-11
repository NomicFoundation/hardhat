import { BuidlerContext } from "../../src/internal/context";
import { glob } from "../../src/internal/util/glob";

export async function resetBuidlerContext() {
  if (BuidlerContext.isCreated()) {
    const ctx = BuidlerContext.getBuidlerContext();
    const globalAsAny = global as any;
    if (ctx.environment !== undefined) {
      for (const key of Object.keys(ctx.environment)) {
        globalAsAny[key] = undefined;
      }
      // unload config file too.
      unloadModule(ctx.environment.config.paths.configFile);
    }
    BuidlerContext.deleteBuidlerContext();
  }
  // Unload all the buidler's entrypoints.
  unloadModule("../../src/register");
  unloadModule("../../src/internal/cli/cli");
  unloadModule("../../src/internal/lib/buidler-lib");
  unloadModule("../../src/internal/core/config/config-env");
  unloadModule("../../src/internal/core/tasks/builtin-tasks");

  // and buidler's builtin tasks.
  const tasks = await glob(__dirname + "/../../src/builtin-tasks/**/*");
  tasks.forEach((task: string) => {
    unloadModule(task);
  });
}

export function unloadModule(path: string) {
  try {
    delete require.cache[require.resolve(path)];
  } catch (err) {
    // module wasn't loaded
  }
}
