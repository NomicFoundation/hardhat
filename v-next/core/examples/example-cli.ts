import { join, isAbsolute } from "node:path";
import { HardhatRuntimeEnvironment } from "../src/types/hre.js";
import { createHardhatRuntimeEnvironment } from "../src/index.js";

export async function main() {
  try {
    const then = process.hrtime.bigint();
    const [_node, _main, configPath] = process.argv;

    if (configPath === undefined) {
      console.error("No config file provided");
      return;
    }

    const resolvedConfigPath = isAbsolute(configPath)
      ? configPath
      : join(process.cwd(), configPath);

    const config = (await import(resolvedConfigPath)).default;

    if (config === undefined) {
      console.error("No config returned");
      return;
    }

    const hre = await createHardhatRuntimeEnvironment(config);

    const now = process.hrtime.bigint();
    console.log("Time to initialize the HRE (ms):", (now - then) / 1000000n);

    await hre.tasks.getTask("test").run({});

    await ignitionMockTask(hre);
  } catch (error) {
    process.exitCode = 1;
    console.error(error);
  }
}

// This is a prototype of ignition's main task.
//
// In this prototype we use user interactions to ask for the
// user attention and request input, right in the middle of
// ignition's executioon, without breaking its output.
async function ignitionMockTask(hre: HardhatRuntimeEnvironment) {
  // This code simulates asking the user for a private key in the
  // middle of the execution. It could be from a provider, for example.
  setTimeout(async () => {
    // The private key is lazily fetched, so it uses a user interruption
    // to ask for it.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pk = await hre.config.privateKey!.get();
    await hre.interruptions.displayMessage("CLI", "Got private key: " + pk);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const pk2 = await hre.config.privateKey!.get();
    await hre.interruptions.displayMessage("CLI", "Got private key: " + pk2);
  }, 500);

  // This is our "complex" ui
  for (let i = 0; i < 20; i++) {
    // We only print/refresh the ui in an uninterrupted block, so
    // that the user interruptions don't break it.
    await hre.interruptions.uninterrupted(async () => {
      // UI magic ✨
      console.log(`UI refresh: ${i}`);
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
