import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

function getEnv(key: string): string {
  const variable = process.env[key];
  if (variable === undefined) {
    throw new Error(`${key} is not set`);
  }
  return variable.trim();
}

export const INFURA_URL = getEnv("INFURA_URL");
export const ALCHEMY_URL = getEnv("ALCHEMY_URL");
