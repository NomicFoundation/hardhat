import { task } from "hardhat/config";

export default {
  tasks: [
    task("test-task", "Print a test")
      .setLazyAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};
