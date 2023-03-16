import React from "react";
import MDLink from "./MDLink";
import { mdWrapper } from "../../../.storybook/common-decorators";
import Paragraph from "./Paragraph";

export default {
  title: "MDX components/Links",
  decorators: [mdWrapper],
};

export const External = () => (
  <Paragraph>
    <span>Here is a link to</span>
    <MDLink href="https://hardhat.org/">hardhat.org</MDLink>
  </Paragraph>
);
export const Internal = () => (
  <Paragraph>
    <span>Here is a link to</span>
    <MDLink href="/">some internal path</MDLink>
  </Paragraph>
);
