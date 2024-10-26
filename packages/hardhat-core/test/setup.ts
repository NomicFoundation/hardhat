import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import picocolors from "picocolors";

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
export const ALCHEMY_URL = getEnv("ALCHEMY_URL");

function printForkingLogicNotBeingTestedWarning(varName: string) {
  console.warn(
    picocolors.yellow(
      `TEST RUN INCOMPLETE: You need to define the env variable ${varName}`
    )
  );
}

if (INFURA_URL === undefined) {
  printForkingLogicNotBeingTestedWarning("INFURA_URL");
}

if (ALCHEMY_URL === undefined) {
  printForkingLogicNotBeingTestedWarning("ALCHEMY_URL");
}
