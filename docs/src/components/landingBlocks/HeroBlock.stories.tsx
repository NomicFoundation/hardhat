import React from "react";
import HeroBlock from "./HeroBlock";
import homepageContent from "../../content/home";

const { heroBlockContent } = homepageContent;

export default {
  title: "Landing Blocks/Hero",
};

export const Default = () => <HeroBlock content={heroBlockContent} />;
