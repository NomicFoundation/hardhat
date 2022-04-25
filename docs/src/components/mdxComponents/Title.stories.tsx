import React from "react";
import Title from "./Title";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Headings",
  decorators: [mdWrapper],
};

export const Primary = () => <Title.H2>Lorem Ipsum</Title.H2>;
