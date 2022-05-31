import React from "react";
import Table from "./Table";
import { mdWrapper } from "../../../.storybook/common-decorators";

export default {
  title: "MDX components/Table",
  decorators: [mdWrapper],
};

export const MDTable = () => (
  <Table>
    <thead>
      <th>Example</th>
      <th>Example</th>
    </thead>
    <tbody>
      <tr>
        <td>Lorem ipsum Lorem ipsum, dolor </td>
        <td>sit amet consectetur adipisicing</td>
      </tr>
      <tr>
        <td>Lorem ipsum Lorem ipsum, dolor </td>
        <td>sit amet consectetur adipisicing</td>
      </tr>
    </tbody>
  </Table>
);
