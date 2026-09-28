// Runs registerNativeKeccak256 under the scenario named in argv[2], then prints
// the keccak256 of the empty input so the parent can check ethers still hashes.
import * as ethers from "ethers";

import { registerNativeKeccak256 } from "../../src/internal/native-keccak256.js";

const scenario = process.argv[2];

if (scenario === "ethers-locked") {
  ethers.keccak256.lock();
}

registerNativeKeccak256();

// Reports the result to the parent test, which captures this process's stdout
// via execFile and parses it. Nothing is printed to the terminal.
console.log(ethers.keccak256("0x"));
