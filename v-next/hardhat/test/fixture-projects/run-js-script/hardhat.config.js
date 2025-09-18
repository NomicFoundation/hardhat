import { task } from "hardhat/config";

export default {
  tasks: [
    task("test-task", "Print a test")
      .setAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};
