import type { HardhatPlugin } from "../../../types/plugins.js";

import { getLoadedPlugins } from "./loaded-plugins-registry.js";

export function warnAboutUnusedLoadedPlugins(
  resolvedPlugins: HardhatPlugin[],
  printError: (message: string) => void = (message) => console.error(message),
  loadedPlugins: Iterable<HardhatPlugin> = getLoadedPlugins().values(),
): void {
  const resolvedIds = new Set(resolvedPlugins.map((p) => p.id));

  const unused: HardhatPlugin[] = [];
  for (const plugin of loadedPlugins) {
    if (!resolvedIds.has(plugin.id)) {
      unused.push(plugin);
    }
  }

  if (unused.length === 0) {
    return;
  }

  const lines: string[] = [
    "Warning: the following plugins were imported but are not present in your `plugins` array in hardhat.config.ts:",
    "",
  ];

  for (const plugin of unused) {
    const name =
      plugin.npmPackage !== undefined && plugin.npmPackage !== null
        ? `${plugin.npmPackage}  (id: ${plugin.id})`
        : plugin.id;
    lines.push(`  - ${name}`);
  }

  lines.push(
    "",
    "Add them to `plugins: [...]` in your config to enable them, or remove the import if intentional.",
  );

  printError(lines.join("\n"));
}
