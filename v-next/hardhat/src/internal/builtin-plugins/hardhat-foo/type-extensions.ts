declare module "@nomicfoundation/hardhat-core/types/config" {
  interface FooUserConfig {
    bar?: number | number[];
  }

  interface FooConfig {
    bar: number[];
  }

  interface HardhatUserConfig {
    privateKey?: SensitiveString;
    foo?: FooUserConfig;
  }

  interface HardhatConfig {
    privateKey?: ResolvedConfigurationVariable;
    foo: FooConfig;
  }
}
