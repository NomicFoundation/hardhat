import { task } from "hardhat/config";

export default {
  tasks: [
    task("test-task", "Prints a test")
      .setAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};
