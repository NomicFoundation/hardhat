import React from "react";
import CodeBlocks from "./CodeBlocks";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/CodeBlocks",
  decorators: [mdWrapper],
};

export const Code = () => <CodeBlocks.Code>console.log(1)</CodeBlocks.Code>;

export const Pre = () => (
  <CodeBlocks.Pre className="">
    <code>
      {`
    $ npx hardhat init
    888    888                      888 888               888
    888    888                      888 888               888
    888    888                      888 888               888
    8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
    888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
    888    888 .d888888 888    888  888 888  888 .d888888 888
    888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
    888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

    Welcome to Hardhat v2.0.8

    ? What do you want to do? …
    ❯ Create a sample project
      Create an advanced sample project
      Create an advanced sample project that uses TypeScript
      Create an empty hardhat.config.js
      Quit
    `}
    </code>
  </CodeBlocks.Pre>
);
