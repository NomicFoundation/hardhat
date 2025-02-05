import type { ArtifactManager } from "../../../types/artifacts.js";

declare module "../../../types/hre.js" {
  interface HardhatRuntimeEnvironment {
    artifacts: ArtifactManager;
  }
}
