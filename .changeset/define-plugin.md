---
"hardhat": minor
---

Added `definePlugin`, a new helper exported from `hardhat/plugins`. Plugin authors should wrap their plugin literal with it so the default export of their `index` module becomes:

```ts
import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

const hardhatPlugin: HardhatPlugin = definePlugin({
  id: "my-plugin",
  // ...
});

export default hardhatPlugin;
```

`definePlugin` returns its argument unchanged and, as a side effect, registers the plugin's id in a process-wide registry of loaded plugins. Hardhat's CLI uses that registry to warn when a plugin is imported but missing from the user's `plugins` array.
