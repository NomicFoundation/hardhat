import React from "react";
import { Meta, StoryObj } from "@storybook/react";
import EmailForm from "./EmailForm";

const meta: Meta<typeof EmailForm> = {
  title: "Landing Blocks/EmailForm",
  component: EmailForm,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof EmailForm>;

export const Default: Story = {
  args: {
    endpoint: "/api/subscribe",
  },
};