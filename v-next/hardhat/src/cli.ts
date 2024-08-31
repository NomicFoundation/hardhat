import { register } from "tsx/esm/api";

// Note: We import the builtin plugins' types here, so that any type extension
// they may have gets loaded.
import "./internal/builtin-plugins/index.js";

// We enable the sourcemaps before loading main, so that everything except this
// small file is loaded with sourcemaps enabled.
process.setSourceMapsEnabled(true);

// Register tsx
const _unregister = register();

// eslint-disable-next-line no-restricted-syntax -- Allow top-level await here
const { main } = await import("./internal/cli/main.js");

main(process.argv.slice(2)).catch(() => {
  process.exitCode = 1;
});
