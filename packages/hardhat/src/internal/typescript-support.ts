import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import {
  DEFAULT_TYPESCRIPT_SUPPORT_MODE,
  MIN_NATIVE_TS_NODE_VERSION,
  isNativeTypeStrippingAvailable,
  isValidTypescriptSupportMode,
  readTypescriptSupportField,
  type TypescriptSupportMode,
} from "@nomicfoundation/hardhat-utils/typescript-support";

const log = createDebug("hardhat:core:typescript-support");

/**
 * Resolves how the project's TypeScript files should be loaded, based on the
 * `hardhat.typescriptSupport` field in the closest `package.json` to
 * `projectRoot`.
 *
 * If the field is absent, the {@link DEFAULT_TYPESCRIPT_SUPPORT_MODE} is used.
 * While that default is still `"tsx"` (pre-stable), a one-time deprecation
 * nudge is printed so users adopt the field before the default flips.
 *
 * @param projectRoot The root of the Hardhat project.
 * @param print An optional sink for the deprecation nudge.
 * @returns The resolved TypeScript support mode.
 * @throws HardhatError if the field is present but has an invalid value.
 */
export async function resolveTypescriptSupportMode(
  projectRoot: string,
  print?: (message: string) => void,
): Promise<TypescriptSupportMode> {
  const field = await readTypescriptSupportField(projectRoot);

  if (field === undefined) {
    if (DEFAULT_TYPESCRIPT_SUPPORT_MODE === "tsx" && print !== undefined) {
      print(
        `Warning: Your package.json doesn't set "hardhat.typescriptSupport". Hardhat is defaulting to "tsx", but a future release will default to "native" (Node.js' built-in type stripping). Set "hardhat": { "typescriptSupport": "tsx" } to keep using tsx, or "native" to opt in early.`,
      );
    }

    log(
      `No typescriptSupport field set, using default "${DEFAULT_TYPESCRIPT_SUPPORT_MODE}"`,
    );

    return DEFAULT_TYPESCRIPT_SUPPORT_MODE;
  }

  if (!isValidTypescriptSupportMode(field)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_TYPESCRIPT_SUPPORT_VALUE,
      { value: field },
    );
  }

  log(`Resolved typescriptSupport mode "${field}"`);

  return field;
}

/**
 * Asserts that the current runtime can strip TypeScript types natively, i.e.
 * that the `"native"` mode is usable here.
 *
 * @throws HardhatError if native type stripping isn't available.
 */
export function assertNativeModeIsUsable(): void {
  if (isNativeTypeStrippingAvailable()) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CORE.GENERAL.NATIVE_TS_REQUIRES_NEWER_NODE,
    {
      nodeVersion: process.versions.node,
      minVersion: MIN_NATIVE_TS_NODE_VERSION.join("."),
    },
  );
}
