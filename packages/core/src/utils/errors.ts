import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class IgnitionError extends NomicLabsHardhatPluginError {
  constructor(message: string) {
    super("ignition", message);
  }
}
