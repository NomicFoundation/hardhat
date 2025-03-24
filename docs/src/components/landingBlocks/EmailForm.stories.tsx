import { Meta, StoryObj } from "@storybook/react";
import EmailForm, { EmailFormProps } from "./EmailForm";

const meta: Meta<typeof EmailForm> = {
  title: "Landing Blocks/EmailForm",
  component: EmailForm,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

export const Default: StoryObj<EmailFormProps> = {
  args: {
    endpoint: "/api/subscribe",
  },
};
