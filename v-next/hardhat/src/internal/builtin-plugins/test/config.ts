import type {
  HardhatConfig,
  HardhatUserConfig,
} from "../../../types/config.js";

export async function resolveTestUserConfig(
  userConfig: HardhatUserConfig,
  resolvedConfig: HardhatConfig,
): Promise<HardhatConfig> {
  return {
    ...resolvedConfig,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the
    empty object is typed correctly by core type, but not when the solidity test
    plugins extensions are included  */
    test: userConfig.test ?? ({} as any),
  };
}
