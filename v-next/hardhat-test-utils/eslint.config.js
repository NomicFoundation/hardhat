import { createConfig } from "../config/eslint.config.js";

export default createConfig(import.meta.filename, {
  enforceHardhatTestUtils: false,
});
