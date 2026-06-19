import type { HardhatRuntimeEnvironmentHooks } from "../../../../types/hooks.js";

import { createTaskTelemetryRecorder } from "../recorder.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (_context, hre) => {
    // Every HRE gets an inactive recorder, so `hre.telemetry.recordTag(...)` is
    // always type-safe and a no-op until the CLI activates it.
    hre.telemetry = createTaskTelemetryRecorder();
  },
});
