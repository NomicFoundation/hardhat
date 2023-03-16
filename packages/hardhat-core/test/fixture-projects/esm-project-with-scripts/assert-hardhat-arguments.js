import * as process from "process";

if (hardhatArguments.network !== "custom") {
  process.exit(1);
}
