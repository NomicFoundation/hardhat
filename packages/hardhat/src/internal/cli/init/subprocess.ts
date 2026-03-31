import type { LastParameter } from "../../../types/utils.js";

import { spawn as nodeSpawn } from "node:child_process";

export async function spawn(
  command: string,
  args: string[],
  options: LastParameter<typeof nodeSpawn>,
): Promise<void> {
  const child = nodeSpawn(command, args, options);
  await new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Command "${command} ${args.join(" ")}" exited with code ${code}`,
          ),
        );
        return;
      }
      resolve();
    });
  });
}
