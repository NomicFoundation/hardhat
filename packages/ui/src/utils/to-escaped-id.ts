/**
 * Convert Ignition id to an escaped version for safe use in Mermaid diagrams.
 */
export function toEscapedId(id: string): string {
  return id
    .replace("(", "_")
    .replace(")", "_")
    .replace(",", "_")
    .replace(" ", "_");
}
