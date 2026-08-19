/**
 * The platform triple that napi-rs appends to the platform package name, e.g.
 * `@nomicfoundation/edr-linux-x64-gnu`, `@scope/pkg-darwin-arm64`.
 */
const PLATFORM_SUFFIX_REGEX =
  /-(?:android|darwin|freebsd|linux|win32)-(?:arm|arm64|ia32|x64|riscv64|ppc64|s390x)(?:-(?:gnu|musl|msvc|eabi|gnueabihf))?$/;

/**
 * Matches both the CJS (`Cannot find module 'x'`) and ESM
 * (`Cannot find package 'x' imported from y`) forms.
 */
const MISSING_MODULE_REGEX = /Cannot find (?:module|package) '([^']+)'/g;

/**
 * The packages Hardhat itself ships a native binding for.
 */
const HARDHAT_NATIVE_BINDING_PACKAGES = [
  "@nomicfoundation/edr",
  "@nomicfoundation/solidity-analyzer",
];

export interface NativeBindingFailure {
  /** The package whose loader failed, e.g. `@nomicfoundation/edr`. */
  parentPackage: string;
  /** The platform package that couldn't be found. */
  missingPackage: string;
}

/**
 * Detect whether a given error is a napi-rs native binding load failure.
 *
 * Packages like `@nomicfoundation/edr` and `@nomicfoundation/solidity-analyzer`
 * ship one prebuilt binary per platform in a separate package, and their
 * generated loader `require`s the one matching the current platform. When that
 * package is missing from the installation the loader throws at import time, so
 * the failure surfaces as an opaque `MODULE_NOT_FOUND` from deep inside
 * `node_modules`.
 */
export function detectNativeBindingFailure(
  error: Error,
): NativeBindingFailure | undefined {
  const chain = errorChain(error);

  // Some link in the chain names the missing platform package.
  for (const chainedError of chain) {
    for (const match of chainedError.message.matchAll(MISSING_MODULE_REGEX)) {
      const moduleName = match[1];

      if (!PLATFORM_SUFFIX_REGEX.test(moduleName)) {
        continue;
      }

      const parentPackage = moduleName.replace(PLATFORM_SUFFIX_REGEX, "");

      if (!HARDHAT_NATIVE_BINDING_PACKAGES.includes(parentPackage)) {
        continue;
      }

      return { missingPackage: moduleName, parentPackage };
    }
  }

  return undefined;
}

function errorChain(error: Error): Error[] {
  const chain: Error[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}
