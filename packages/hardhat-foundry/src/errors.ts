import { HardhatPluginError } from "hardhat/plugins";

export class HardhatFoundryError extends HardhatPluginError {
  constructor(message: string) {
    super("hardhat-foundry", message);
  }
}

export function getPluginError(error: any) {
  if (error.status && error.stderr) {
    switch (error.status) {
      case 127:
        return new HardhatFoundryError(
          "Couldn't run `forge`. Please check that your foundry installation is correct."
        );
      case 134:
        return new HardhatFoundryError(
          "Running `forge` failed. Please check that your foundry.toml file is correct."
        );
      default:
        return new HardhatFoundryError(
          `Unexpected error while running \`forge\`:${error.stderr.toString()}`
        );
    }
  }

  return new HardhatFoundryError(`Unexpected error: ${error}`);
}
