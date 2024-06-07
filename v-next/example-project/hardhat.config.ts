import { task, HardhatUserConfig } from "@nomicfoundation/hardhat/config";

export default {
  tasks: [
    task("hello", "Prints a greeting")
      .addNamedParameter({
        name: "greeting",
        description: "The greeting to print",
        defaultValue: "Hello, World!",
      })
      .setAction(async ({ greeting }, _) => {
        console.log(greeting);
      })
      .build(),
  ],
} satisfies HardhatUserConfig;
