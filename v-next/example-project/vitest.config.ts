import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul", // or 'istanbul'
      reporter: ["text"],
    },
  },
});
