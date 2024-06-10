import { HardhatUserConfig, task } from "@nomicfoundation/hardhat-core/config";

export let userTaskResult = false;

const userTask = task("user-task")
  // .addVariadicParameter({
  //   name: "testFiles",
  //   description: "An optional list of files to test",
  //   defaultValue: [],
  // })
  // .addNamedParameter({
  //   name: "noCompile",
  //   description: "Don't compile before running this task",
  // })
  // .addFlag({
  //   name: "parallel",
  //   description: "Run tests in parallel",
  // })
  // .addFlag({
  //   name: "bail",
  //   description: "Stop running tests after the first test failure",
  // })
  // .addNamedParameter({
  //   name: "grep",
  //   description: "Only run tests matching the given string or regexp",
  // })
  .setAction(() => {
    userTaskResult = true;
  })
  .build();

export default {
  tasks: [userTask],
} satisfies HardhatUserConfig;
