import type { HardhatUserConfig } from "../../src/config.js";
import type { UnsafeHardhatRuntimeEnvironmentOptions } from "../../src/internal/core/types.js";
import type { GlobalOptions } from "../../src/types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../../src/types/hre.js";
import type { HardhatPlugin } from "../../src/types/plugins.js";

import "../../src/internal/builtin-plugins/artifacts/type-extensions.js";

import { createHardhatRuntimeEnvironment } from "../../src/hre.js";
import artifacts from "../../src/internal/builtin-plugins/artifacts/index.js";

import { MockArtifactsManager } from "./mock-artifacts-manager.js";

export async function createMockHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  projectRoot?: string,
  unsafeOptions: UnsafeHardhatRuntimeEnvironmentOptions = {},
): Promise<HardhatRuntimeEnvironment> {
  return createHardhatRuntimeEnvironment(
    { ...config, plugins: [mockArtifactsPlugin, ...(config.plugins ?? [])] },
    userProvidedGlobalOptions,
    projectRoot,
    unsafeOptions,
  );
}

const mockArtifactsPlugin: HardhatPlugin = {
  id: "mock-artifacts",
  dependencies: [async () => artifacts],
  hookHandlers: {
    hre: async () => {
      return {
        created: async (_context, hre): Promise<void> => {
          hre.artifacts = new MockArtifactsManager();
        },
      };
    },
  },
};
