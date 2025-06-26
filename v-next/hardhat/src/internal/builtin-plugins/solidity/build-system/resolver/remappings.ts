import type { Remapping } from "./types.js";

/**
 * Tries to parse a remapping string, returning undefined if it's invalid.
 */
export function parseRemappingString(remapping: string): Remapping | undefined {
  let rest = remapping;
  const colon = rest.indexOf(":");

  let context: string;

  if (colon !== -1) {
    context = rest.substring(0, colon);
    rest = rest.substring(colon + 1);
  } else {
    context = "";
  }

  const equal = rest.indexOf("=");
  if (equal === -1) {
    return undefined;
  }

  const prefix = rest.substring(0, equal);

  if (prefix === "") {
    return undefined;
  }

  const target = rest.substring(equal + 1);

  return { context, prefix, target };
}

/**
 * Selects the best remapping for a direct import, if any.
 *
 * @param fromSouceName The source name fo the file with the import.
 * @param directImport The import path, which must be a direct import.
 * @param remappings The array of remmappings to consider.
 * @returns The best remappings index or undefined if none is found.
 */
export function selectBestRemapping(
  fromSouceName: string,
  directImport: string,
  remappings: Remapping[],
): number | undefined {
  let bestRemappingIndex: number | undefined;

  let longestContext = 0;
  let longestPrefix = 0;

  for (let i = 0; i < remappings.length; i++) {
    const remapping = remappings[i];
    const contextLength = remapping.context.length;

    if (contextLength < longestContext) {
      continue;
    }

    if (!fromSouceName.startsWith(remapping.context)) {
      continue;
    }

    if (
      remapping.prefix.length < longestPrefix &&
      contextLength === longestContext
    ) {
      continue;
    }

    if (!directImport.startsWith(remapping.prefix)) {
      continue;
    }

    longestContext = contextLength;
    longestPrefix = remapping.prefix.length;
    bestRemappingIndex = i;
  }

  return bestRemappingIndex;
}

/**
 * Applies a remapping assuming that it's valid for this importPath.
 */
export function applyValidRemapping(
  importPath: string,
  remapping: Remapping,
): string {
  return remapping.target + importPath.substring(remapping.prefix.length);
}

export function formatRemapping(remapping: Remapping): string {
  if (remapping.context === "") {
    return `${remapping.prefix}=${remapping.target}`;
  }

  return `${remapping.context}:${remapping.prefix}=${remapping.target}`;
}
