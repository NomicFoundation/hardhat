import { task } from "@nomicfoundation/hardhat/config";

export default {
  tasks: [
    task("test", "Prints a test")
      .setAction(async () => {
        console.log("test!");
      })
      .build(),
  ],
};
