import React from "react";
import CTA from "./CTA";

export default {
  title: "UI components/CTA",
};

export const Primary = () => <CTA href="/">primary button</CTA>;
export const Secondary = () => (
  <CTA href="/" variant="secondary">
    secondary button
  </CTA>
);
