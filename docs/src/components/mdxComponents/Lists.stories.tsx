import React from "react";
import OrderedList from "./OrderedList";
import UnorderedList from "./UnorderedList";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Lists",
  decorators: [mdWrapper],
};

export const Ordered = () => (
  <OrderedList>
    <li>Lorem ipsum dolor sit amet consectetur adipisicing elit..</li>
    <li>Lorem ipsum dolor sit amet consectetur elit.</li>
    <li>Lorem ipsum dolor sit amet adipisicing elit.</li>
    <li>Lorem ipsum dolor sit amet consectetur adipisicing elit.</li>
    <li>Lorem dolor sit consectetur adipisicing elit.</li>
  </OrderedList>
);
export const Unordered = () => (
  <UnorderedList>
    <li>Lorem ipsum dolor sit amet consectetur adipisicing elit..</li>
    <li>Lorem ipsum dolor sit amet consectetur elit.</li>
    <li>Lorem ipsum dolor sit amet adipisicing elit.</li>
    <li>Lorem ipsum dolor sit amet consectetur adipisicing elit.</li>
    <li>Lorem dolor sit consectetur adipisicing elit.</li>
  </UnorderedList>
);
