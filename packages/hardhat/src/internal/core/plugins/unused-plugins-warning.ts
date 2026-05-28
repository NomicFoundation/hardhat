import type { HardhatPlugin } from "../../../types/plugins.js";

import { styleText } from "node:util";

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
    "",
    styleText(["bold", "yellow"], "Warning:") +
      " the following plugins were imported but are not present in the `plugins` array of your config:",
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
    "  Add them to the `plugins` array, or remove the unused plugin import(s) to silence this warning.",
    "",
  );

  printError(lines.join("\n"));
}
