import { afterEach } from "node:test";

export function createTestEnvManager() {
  const changes = new Set<string>();
  const originalValues = new Map<string, string | undefined>();

  afterEach(() => {
    // Revert changes to process.env based on the originalValues Map entries
    changes.forEach((key) => {
      const originalValue = originalValues.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    });
    changes.clear();
  });

  return {
    setEnvVar(name: string, value: string): void {
      // Before setting a new value, save the original value if it hasn't been saved yet
      if (!changes.has(name)) {
        originalValues.set(name, process.env[name]);
        changes.add(name);
      }
      process.env[name] = value;
    },
  };
}
