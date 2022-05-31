import React from "react";
import Title from "./Title";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Headings",
  decorators: [mdWrapper],
};

export const H1 = () => <Title.H1>Lorem Ipsum</Title.H1>;
export const H2 = () => <Title.H2>Lorem Ipsum</Title.H2>;
export const H3 = () => <Title.H3>Lorem Ipsum</Title.H3>;
export const H4 = () => <Title.H4>Lorem Ipsum</Title.H4>;
export const H5 = () => <Title.H5>Lorem Ipsum</Title.H5>;
