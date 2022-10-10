import { runCmdSync } from "./runCmd";

let remappings: { [from: string]: string };

export function getRemappings() {
  // Return remappings if they were already loaded
  if (remappings !== undefined) {
    return remappings;
  }

  // Get remappings from foundry
  const remappingsTxt = runCmdSync("forge remappings");

  remappings = {};
  const remappingLines = remappingsTxt.split("\n");
  for (const remappingLine of remappingLines) {
    const fromTo = remappingLine.split("=");
    if (fromTo.length !== 2) {
      continue;
    }

    const [from, to] = fromTo;

    // source names with "node_modules" in it have special treatment in hardhat core, so we skip them
    if (to.includes("node_modules")) {
      continue;
    }

    remappings[from] = to;
  }

  return remappings;
}
