export interface RuntimeInfo {
  runtime: "bun" | "deno" | "node";
  version: string;
}

declare const globalThis: {
  Deno?: { version?: { deno?: string } };
};

/**
 * Detects the JavaScript runtime environment (Node.js, Deno, Bun, or unknown)
 * and its version.
 *
 * @returns An object containing the runtime type and version, or `undefined`
 * if the runtime cannot be detected.
 */
export function getRuntimeInfo(): RuntimeInfo | undefined {
  // Deno
  const deno = globalThis.Deno;
  if (typeof deno === "object" && deno?.version?.deno !== undefined) {
    return {
      runtime: "deno",
      version: deno.version.deno,
    };
  }

  // Bun: this should be checked before Node.js since Bun also defines
  // `process.versions.node`
  if (typeof process !== "undefined" && process.versions?.bun !== undefined) {
    return {
      runtime: "bun",
      version: process.versions.bun,
    };
  }

  // Node
  if (typeof process !== "undefined" && process.versions?.node !== undefined) {
    return {
      runtime: "node",
      version: process.versions.node,
    };
  }

  return undefined;
}
