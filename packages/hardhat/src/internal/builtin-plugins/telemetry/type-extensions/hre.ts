import type { TaskTelemetry } from "../recorder.js";

declare module "../../../../types/hre.js" {
  export interface HardhatRuntimeEnvironment {
    telemetry: TaskTelemetry;
  }
}
