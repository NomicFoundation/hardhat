/**
 * Convert Ignition id to an escaped version for safe use in Mermaid diagrams.
 */
export function toEscapedId(id: string): string {
  return id
    .replaceAll("(", "__")
    .replaceAll(")", "___")
    .replaceAll(",", "____")
    .replaceAll("~", "_____")
    .replaceAll("#", "______")
    .replaceAll(" ", "_______");
}
