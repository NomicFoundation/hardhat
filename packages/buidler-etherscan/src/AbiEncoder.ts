import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import abi from "ethereumjs-abi";

export default class AbiEncoder {
  public static encodeConstructor(
    contractAbi: any[],
    constructorArguments: string[]
  ): string {
    const constructorAbi: any | undefined = contractAbi.find(
      value => value.type === "constructor"
    );

    if (constructorAbi === undefined) {
      return "";
    }

    if (constructorAbi.inputs.length !== constructorArguments.length) {
      throw new BuidlerPluginError(
        `Invalid number of constructor arguments:
          Expected: ${constructorAbi.inputs.length}
          Received: ${constructorArguments.length}`
      );
    }

    const types = constructorAbi.inputs.map(
      (value: { type: string }) => value.type
    );

    return abi.rawEncode(types, constructorArguments).toString("hex");
  }
}
