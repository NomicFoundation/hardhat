import React from "react";

import defaultProps from "../ui/default-props";
import TrustedTeamsBlock from "./TrustedTeamsBlock";

const { defaultTrustedTeamsBlockContent } = defaultProps;

export default {
  title: "Landing Blocks/Trusted teams",
};

export const Default = () => (
  <TrustedTeamsBlock content={defaultTrustedTeamsBlockContent} />
);
