import React from "react";
import HeroBlock from "./HeroBlock";
import defaultProps from "../ui/default-props";

const { defaultHeroBlockContent } = defaultProps;

export default {
  title: "Landing Blocks/Hero",
};

export const Default = () => <HeroBlock content={defaultHeroBlockContent} />;
