import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";
import type { HardhatPlugin } from "@ignored/hardhat-vnext-core/types/plugins";

import { globalOption } from "@ignored/hardhat-vnext/config";

export const testPlugin: HardhatPlugin = {
  id: "test-plugin",
  globalOptions: [
    globalOption({
      name: "myGlobalOption",
      description: "A global option",
      defaultValue: "default",
    }),
  ],
};

const config: HardhatUserConfig = {
  plugins: [testPlugin],
};

export default config;
