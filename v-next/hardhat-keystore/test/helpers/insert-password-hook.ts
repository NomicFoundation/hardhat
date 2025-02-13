import type { HookContext } from "@ignored/hardhat-vnext/types/hooks";
import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export const setupKeystorePassword = (
  secretsToMock: string[],
): HardhatPlugin => {
  const hardhatKeystoreInputPasswordMockPlugin: HardhatPlugin = {
    id: "hardhat-keystore-input-password-mock",
    hookHandlers: {
      userInterruptions: async () => {
        return {
          requestSecretInput: async (
            _context: HookContext,
            _interruptor: string,
            _inputDescription: string,
            _next: (
              nextContext: HookContext,
              nextInterruptor: string,
              nextInputDescription: string,
            ) => Promise<string>,
          ) => {
            const secret = secretsToMock.reverse().pop();

            assertHardhatInvariant(
              secret !== undefined,
              "secretsToMock should not be empty",
            );

            return secret;
          },
        };
      },
    },
  };

  return hardhatKeystoreInputPasswordMockPlugin;
};
