import { ConfigurationVariable } from "./types/config.js";

export function configVariable(name: string): ConfigurationVariable {
  return { _type: "ConfigurationVariable", name };
}
