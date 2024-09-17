import type { ArtifactsManager } from "../../../types/artifacts.js";

declare module "../../../types/hre.js" {
  interface HardhatRuntimeEnvironment {
    artifacts: ArtifactsManager;
  }
}
