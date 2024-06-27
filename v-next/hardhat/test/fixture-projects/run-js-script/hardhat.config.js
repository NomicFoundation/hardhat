import { task } from "@ignored/hardhat-vnext/config";

export default {
  tasks: [
    task("test", "Prints a test")
      .setAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};
