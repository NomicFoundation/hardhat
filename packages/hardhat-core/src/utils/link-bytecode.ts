import { Artifact, Link } from "../types";

export function linkBytecode(artifact: Artifact, libraries: Link[]): string {
  let bytecode = artifact.bytecode;

  // TODO: measure performance impact
  for (const { sourceName, libraryName, address } of libraries) {
    const linkReferences = artifact.linkReferences[sourceName][libraryName];
    for (const { start, length } of linkReferences) {
      bytecode =
        bytecode.substring(0, 2 + start * 2) +
        address.substring(2) +
        bytecode.substring(2 + (start + length) * 2);
    }
  }

  return bytecode;
}
