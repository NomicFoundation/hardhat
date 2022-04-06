import React from "react";

import TrustedTeamsBlock from "./TrustedTeamsBlock";
import homepageContent from "../../content/home";

export default {
  title: "Landing Blocks/Trusted teams",
};

export const Default = () => (
  <TrustedTeamsBlock content={homepageContent.trustedTeamsBlockContent} />
);
