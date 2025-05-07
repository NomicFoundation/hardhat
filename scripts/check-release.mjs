// @ts-check

import { appendFile } from "node:fs/promises";

import { readPackage, isPackageReleasedToNpm } from "./lib/packages.mjs";

async function checkRelease() {
  if (process.env.GITHUB_OUTPUT === undefined) {
    throw new Error("GITHUB_OUTPUT is not defined");
  }

  const hardhat = await readPackage("hardhat");
  const released = await isPackageReleasedToNpm(hardhat.name, hardhat.version);

  console.log(`released: ${released}`);

  await appendFile(process.env.GITHUB_OUTPUT, `released=${released}\n`);
}

await checkRelease();
