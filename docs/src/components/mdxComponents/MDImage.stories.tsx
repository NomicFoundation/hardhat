import React from "react";
import MDImage from "./MDImage";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Media",
  decorators: [mdWrapper],
};

export const Image = () => (
  <MDImage src="/hardhat-tutorial.svg" alt="example2" />
);
export const Gif = () => <MDImage src="/hh.gif" alt="example" />;
