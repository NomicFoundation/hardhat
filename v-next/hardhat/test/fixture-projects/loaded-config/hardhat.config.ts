import type { HardhatUserConfig } from "../../../src/types/config.js";
import type { HardhatPlugin } from "../../../src/types/plugins.js";

import { globalOption } from "../../../src/internal/core/config.js";

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
