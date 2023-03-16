import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

function getEnv(key: string): string | undefined {
  const variable = process.env[key];
  if (variable === undefined || variable === "") {
    return undefined;
  }

  const trimmed = variable.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

export const INFURA_URL = getEnv("INFURA_URL");
