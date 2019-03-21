import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import abi from "ethereumjs-abi";

export default class AbiEncoder {
  public static encodeConstructor(
    contractAbi: any[],
    constructorArguments: string[]
  ): string {
    let constructorAbis: any[] = contractAbi.filter(
      value => value.type === "constructor"
    );
    if (constructorAbis.length === 0) {
      return "";
    }
    constructorAbis = constructorAbis.filter(
      value => value.inputs.length === constructorArguments.length
    );
    if (constructorAbis.length === 0) {
      throw new BuidlerPluginError("Invalid number of constructor arguments");
    }
    const types = constructorAbis[0].inputs.map(
      (value: { type: string }) => value.type
    );
    return abi.rawEncode(types, constructorArguments).toString("hex");
  }
}
