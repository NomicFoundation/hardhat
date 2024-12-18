// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded when the user imports `hardhat/types/config`.
import "../internal/builtin-plugins/index.js";

/**
 * A configuration variable to be fetched at runtime from
 * different sources, depending on the user's setup.
 */
export interface ConfigurationVariable {
  _type: "ConfigurationVariable";
  name: string;
}

/**
 * A resolved configuration variable.
 */
export interface ResolvedConfigurationVariable {
  _type: "ResolvedConfigurationVariable";

  /**
   * Returns the raw value of the configuration variable.
   */
  get(): Promise<string>;

  /**
   * Returns the value of the configuration variable, after
   * validating that it's a URL.
   *
   * @throws an error if the value is not a URL.
   */
  getUrl(): Promise<string>;

  /**
   * Returns the value of the configuration variable interpreted
   * as a BigInt.
   *
   * @throws an error if the value is not a valid BigInt.
   */
  getBigInt(): Promise<bigint>;

  /**
   * Returns the value of the configuration variable, validating that is a
   * valid hex string. Trimming any speaces, and making sure it's lowecase and
   * that it starts with 0x.
   */
  getHexString(): Promise<string>;
}

/**
 * A function that resolves a configuration variable.
 */
export type ConfigurationResolver = (
  variableOrString: ConfigurationVariable | string,
) => ResolvedConfigurationVariable;

/**
 * A sensitive string, which can be provided as a literal
 * string or as a configuration variable.
 */
export type SensitiveString = string | ConfigurationVariable;

/**
 * The user's Hardhat configuration, as exported in their
 * config file.
 */
export interface HardhatUserConfig {
  paths?: ProjectPathsUserConfig;
}

/**
 * The different paths that conform a Hardhat project.
 */
export interface ProjectPathsUserConfig {
  cache?: string;
  artifacts?: string;
  tests?: string | TestPathsUserConfig;
  sources?: string | string[] | SourcePathsUserConfig;
}

/**
 * The different paths were the Hardhat project's tests are located.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- This is
intended to be used through module augmentation. */
export interface TestPathsUserConfig {}

/**
 * The different paths were the Hardhat project's sources are located.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- This is
intended to be used through module augmentation. */
export interface SourcePathsUserConfig {}

/**
 * The resolved Hardhat configuration.
 */
export interface HardhatConfig {
  paths: ProjectPathsConfig;
}

/**
 * The resolved Hardhat project paths configuration.
 *
 * All of the paths in this object are absolute.
 */
export interface ProjectPathsConfig {
  root: string;

  /**
   * An absolute path to the config file, if a config file was loaded.
   *
   * This is only undefined when a HardhatRuntimeEnvironment is created
   * programmatically.
   */
  config?: string;
  cache: string;
  artifacts: string;
  tests: TestPathsConfig;
  sources: SourcePathsConfig;
}

/**
 * The resolved paths were the Hardhat project's tests are located.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- This is
intended to be used through module augmentation. */
export interface TestPathsConfig {}

/**
 * The resolved paths were the Hardhat project's sources are located.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- This is
intended to be used through module augmentation. */
export interface SourcePathsConfig {}
