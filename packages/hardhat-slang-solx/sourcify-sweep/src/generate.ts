import fs from "node:fs";
import path from "node:path";

/**
 * A corpus contract: slang's Sourcify corpus format (format_version 1) plus a
 * `settings` field carrying the contract's original solc compiler_settings.
 * See sourcify-sweep/README.md for provenance.
 */
export interface CorpusContract {
  name: string;
  chain_id: number;
  version: string;
  target: string;
  remappings: string[];
  sources: Record<string, string>;
  settings: {
    evmVersion?: string;
    libraries?: Record<string, Record<string, string>>;
    optimizer?: unknown;
    viaIR?: boolean;
    metadata?: unknown;
    [key: string]: unknown;
  };
}

/** Number of leading `..` segments after normalization. */
function parentLevels(virtualPath: string): number {
  const normalized = path.posix.normalize(virtualPath);
  return (normalized.match(/^(?:\.\.\/)+/)?.[0].length ?? 0) / 3;
}

/**
 * Rewrites virtual source paths that Hardhat cannot represent, including
 * every exact quoted occurrence in import statements:
 * - URL-style paths (`https://...`): solc accepted them as standard-JSON
 *   source keys; Hardhat's resolver cannot represent them.
 * - `..`-prefixed paths (parent-relative verification layouts): joined under
 *   the fixture's source root they would escape it, leaving an empty project
 *   that builds successfully. Every path is re-rooted N synthetic levels
 *   deeper (N = the deepest leading-`..` run), which preserves
 *   relative-import arithmetic because all paths shift uniformly. Remapping
 *   targets and the target path shift along.
 * - Non-lowercase `.sol` extensions (`Token.SOL`): Hardhat's source
 *   discovery only picks up `.sol` files; solc did not care.
 */
function sanitizeVirtualPaths(contract: CorpusContract): {
  sources: Record<string, string>;
  remappings: string[];
  target: string;
} {
  const shiftLevels = Math.max(
    0,
    ...Object.keys(contract.sources).map(parentLevels),
  );
  const shiftPath = (virtualPath: string): string =>
    shiftLevels === 0
      ? virtualPath
      : path.posix.normalize("u/".repeat(shiftLevels) + virtualPath);
  const renames = new Map<string, string>();
  for (const virtualPath of Object.keys(contract.sources)) {
    let newPath = virtualPath;
    if (newPath.includes(":")) {
      newPath = newPath.replaceAll("://", "/").replaceAll(":", "_");
    }
    newPath = shiftPath(newPath);
    if (!newPath.endsWith(".sol") && newPath.toLowerCase().endsWith(".sol")) {
      newPath = `${newPath.slice(0, -4)}.sol`;
    }
    if (newPath !== virtualPath) {
      renames.set(virtualPath, newPath);
    }
  }
  const remappings = contract.remappings.map((remapping) => {
    const equal = remapping.indexOf("=");
    return equal === -1
      ? remapping
      : `${remapping.slice(0, equal + 1)}${shiftPath(remapping.slice(equal + 1))}`;
  });
  const target = renames.get(contract.target) ?? contract.target;
  if (renames.size === 0) {
    return { sources: contract.sources, remappings, target };
  }
  const sources: Record<string, string> = {};
  for (const [virtualPath, original] of Object.entries(contract.sources)) {
    let content = original;
    for (const [oldPath, newPath] of renames) {
      content = content
        .replaceAll(`"${oldPath}"`, `"${newPath}"`)
        .replaceAll(`'${oldPath}'`, `'${newPath}'`);
    }
    sources[renames.get(virtualPath) ?? virtualPath] = content;
  }
  return { sources, remappings, target };
}

/** npm/<name>@<version>/<rest> -> [name, version, rest]; name may be scoped. */
function splitNpmPath(
  virtualPath: string,
): [string, string, string] | undefined {
  const match = virtualPath.match(/^npm\/((?:@[^/]+\/)?[^/@]+)@([^/]+)\/(.+)$/);
  return match === null ? undefined : [match[1], match[2], match[3]];
}

function writeFileMkdirp(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Generates a self-contained Hardhat project for one corpus contract.
 *
 * Layout rules (validated on a 100-contract stratified pilot; see README):
 * - Contracts verified from a Hardhat 3 project (target under `project/`) are
 *   reconstructed as real projects: `project/` at the source root,
 *   `npm/<name>@<ver>/` and other vendored top-level trees as synthesized
 *   node_modules packages, no remappings (Hardhat resolves natively).
 * - Everything else: sources verbatim under `s/<virtual path>`, remappings =
 *   the contract's own (re-rooted under `s/`) + an identity remapping
 *   `P/=s/P/` per top-level prefix so direct imports of project files resolve.
 * - The slangSolx profile receives evmVersion, libraries and viaIR (which
 *   selects solx's Yul pipeline), but not the solc optimizer settings: those
 *   don't map onto solx's LLVM -O modes, so the plugin default applies.
 *
 * `toolchain` is a directory containing a `hardhat` and a
 * `@nomicfoundation/hardhat-slang-solx` entry (typically symlinks to the
 * workspace packages) to merge into each fixture's node_modules.
 */
export function generateFixture(
  contract: CorpusContract,
  out: string,
  toolchain: string,
): void {
  // Regenerate from scratch: a stale remappings.txt or node_modules from a
  // previous layout mode corrupts the run.
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const {
    sources,
    remappings: contractRemappings,
    target,
  } = sanitizeVirtualPaths(contract);
  const tops = new Set(
    Object.keys(sources)
      .filter((v) => v.includes("/"))
      .map((v) => v.split("/", 1)[0]),
  );
  const hh3Native = tops.has("project") && target.startsWith("project/");

  const srcRoot = path.join(out, "s");
  const prefixes = new Set<string>();
  const packages = new Map<string, string>();
  for (const [virtualPath, content] of Object.entries(sources)) {
    let filePath: string;
    if (hh3Native) {
      const npm = splitNpmPath(virtualPath);
      if (npm !== undefined) {
        const [name, version, rest] = npm;
        filePath = path.join(out, "node_modules", name, rest);
        packages.set(name, version);
      } else if (virtualPath.startsWith("project/")) {
        filePath = path.join(srcRoot, virtualPath.slice("project/".length));
      } else {
        // Other top-level trees (vendored libs imported by their dir name)
        // become synthesized packages so npm resolution finds them.
        filePath = path.join(out, "node_modules", virtualPath);
        packages.set(virtualPath.split("/", 1)[0], "0.0.0");
      }
    } else {
      filePath = path.join(srcRoot, virtualPath);
      const slash = virtualPath.indexOf("/");
      if (slash !== -1) {
        prefixes.add(virtualPath.slice(0, slash));
      }
    }
    writeFileMkdirp(filePath, content);
  }

  for (const [name, version] of packages) {
    writeFileMkdirp(
      path.join(out, "node_modules", name, "package.json"),
      JSON.stringify({ name, version }),
    );
  }

  if (!hh3Native) {
    const remappings = [
      // The contract's own remappings point at virtual paths; re-root the
      // targets under s/.
      ...contractRemappings.map((r) => {
        const equal = r.indexOf("=");
        return equal === -1 || r.slice(equal + 1).startsWith("s/")
          ? r
          : `${r.slice(0, equal)}=s/${r.slice(equal + 1)}`;
      }),
      ...[...prefixes].sort().map((p) => `${p}/=s/${p}/`),
    ];
    if (remappings.length > 0) {
      fs.writeFileSync(
        path.join(out, "remappings.txt"),
        remappings.join("\n") + "\n",
      );
    }
  }

  // Frontend-derived outputs used by the runner's --compare mode: solx embeds
  // a forked solc frontend, so these must match stock solc exactly.
  const compareOutputs = {
    "*": { "*": ["abi", "storageLayout", "evm.methodIdentifiers"] },
  };
  const solxSettings: Record<string, unknown> = {
    outputSelection: compareOutputs,
  };
  const solcSettings: Record<string, unknown> = {
    outputSelection: compareOutputs,
  };
  for (const [key, value] of Object.entries(contract.settings)) {
    // viaIR selects solx's Yul pipeline; contracts compiled via-IR can rely
    // on IR-only features (e.g. copying struct arrays to storage), so it must
    // be passed through.
    if (key === "evmVersion" || key === "libraries" || key === "viaIR") {
      solxSettings[key] = value;
    }
    if (
      ["evmVersion", "libraries", "optimizer", "viaIR", "metadata"].includes(
        key,
      )
    ) {
      solcSettings[key] = value;
    }
  }

  fs.writeFileSync(
    path.join(out, "package.json"),
    JSON.stringify({
      name: "sourcify-sweep-fixture",
      private: true,
      type: "module",
    }),
  );
  fs.writeFileSync(
    path.join(out, "hardhat.config.js"),
    `import { defineConfig } from "hardhat/config";
import hardhatSlangSolx from "@nomicfoundation/hardhat-slang-solx";

export default defineConfig({
  plugins: [hardhatSlangSolx],
  paths: { sources: ["s"] },
  solidity: {
    profiles: {
      default: {
        compilers: [{ version: ${JSON.stringify(contract.version)}, settings: ${JSON.stringify(solcSettings)} }],
      },
      slangSolx: {
        compilers: [{ type: "slangSolx", version: ${JSON.stringify(contract.version)}, settings: ${JSON.stringify(solxSettings)} }],
      },
    },
  },
});
`,
  );

  const nodeModules = path.join(out, "node_modules");
  if (packages.size > 0) {
    // Real node_modules holding the synthesized packages; merge the toolchain
    // in via per-entry symlinks (two levels for scopes, which may collide
    // with synthesized scoped packages).
    for (const entry of fs.readdirSync(toolchain)) {
      const src = path.join(toolchain, entry);
      const dest = path.join(nodeModules, entry);
      if (!fs.existsSync(dest)) {
        fs.symlinkSync(src, dest);
      } else if (fs.statSync(src).isDirectory()) {
        for (const sub of fs.readdirSync(src)) {
          const subDest = path.join(dest, sub);
          if (!fs.existsSync(subDest)) {
            fs.symlinkSync(path.join(src, sub), subDest);
          }
        }
      }
    }
  } else {
    fs.symlinkSync(toolchain, nodeModules);
  }
}
