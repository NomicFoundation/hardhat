import { task, HardhatUserConfig } from "@ignored/hardhat-vnext/config";
import { HardhatPluginError } from "@ignored/hardhat-vnext/plugins";

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
  plugins: [
    {
      id: "plugin-example",
      tasks: [
        task("plugin1-hello", "Prints a greeting from plugin1")
          .addOption({
            name: "greeting",
            description: "The greeting to print",
            defaultValue: "Hello, World from plugin1!",
          })
          .setAction(async ({ greeting }, _) => {
            console.log(greeting);

            if (greeting === "") {
              throw new HardhatPluginError(
                "plugin-example",
                "Greeting cannot be empty",
              );
            }
          })
          .build(),
      ],
    },
  ],
} satisfies HardhatUserConfig;
