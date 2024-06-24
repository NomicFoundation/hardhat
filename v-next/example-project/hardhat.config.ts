import { task, HardhatUserConfig } from "@ignored/hardhat-vnext/config";

export default {
  tasks: [
    task("hello", "Prints a greeting")
      .addOption({
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
