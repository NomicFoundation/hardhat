import React from "react";

import defaultProps from "../ui/default-props";
import VibrantCommunityBlock from "./VibrantCommunityBlock";

const { defaultVibrantCommunityBlockContent } = defaultProps;

export default {
  title: "Landing Blocks/Vibrant community",
};

export const Default = () => (
  <VibrantCommunityBlock content={defaultVibrantCommunityBlockContent} />
);
