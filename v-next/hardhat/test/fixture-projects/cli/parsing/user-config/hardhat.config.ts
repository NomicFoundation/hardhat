import { HardhatUserConfig, task } from "@nomicfoundation/hardhat-core/config";

// const task1 = task("test", "Runs mocha tests")
//   .addVariadicParameter({
//     name: "testFiles",
//     description: "An optional list of files to test",
//     defaultValue: [],
//   })
//   .addNamedParameter({
//     name: "noCompile",
//     description: "Don't compile before running this task",
//   })
//   // .addFlag({
//   //   name: "parallel",
//   //   description: "Run tests in parallel",
//   // })
//   // .addFlag({
//   //   name: "bail",
//   //   description: "Stop running tests after the first test failure",
//   // })
//   // .addNamedParameter({
//   //   name: "grep",
//   //   description: "Only run tests matching the given string or regexp",
//   // })
//   .setAction(import.meta.resolve("./tasks/non-existing.ts"))
//   .build();

export default {
  tasks: [],
} satisfies HardhatUserConfig;
