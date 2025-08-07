import type { HardhatUserConfig } from "../../src/config.js";
import type { UnsafeHardhatRuntimeEnvironmentOptions } from "../../src/internal/core/types.js";
import type { GlobalOptions } from "../../src/types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../../src/types/hre.js";
import type { HardhatPlugin } from "../../src/types/plugins.js";

import "../../src/internal/builtin-plugins/artifacts/type-extensions.js";

import { createHardhatRuntimeEnvironment } from "../../src/hre.js";
import artifacts from "../../src/internal/builtin-plugins/artifacts/index.js";

import { MockArtifactManager } from "./mock-artifact-manager.js";

export async function createMockHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  projectRoot?: string,
  unsafeOptions: UnsafeHardhatRuntimeEnvironmentOptions = {},
): Promise<HardhatRuntimeEnvironment & { artifacts: MockArtifactManager }> {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  We know that the mockArtifactPlugin sets `hre.artifacts` to `MockArtifactManager */
  return createHardhatRuntimeEnvironment(
    { ...config, plugins: [mockArtifactsPlugin, ...(config.plugins ?? [])] },
    userProvidedGlobalOptions,
    projectRoot,
    unsafeOptions,
  ) as Promise<HardhatRuntimeEnvironment & { artifacts: MockArtifactManager }>;
}

const mockArtifactsPlugin: HardhatPlugin = {
  id: "mock-artifacts",
  dependencies: () => [Promise.resolve({ default: artifacts })],
  hookHandlers: {
    hre: async () => {
      return {
        created: async (_context, hre): Promise<void> => {
          hre.artifacts = new MockArtifactManager();
        },
      };
    },
  },
};
