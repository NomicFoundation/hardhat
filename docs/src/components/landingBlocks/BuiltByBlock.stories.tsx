import React from "react";

import BuiltByBlock from "./BuiltByBlock";
import defaultProps from "../ui/default-props";

export default {
  title: "Landing Blocks/Built by",
};

export const Default = () => (
  <BuiltByBlock content={defaultProps.defaultBuiltByBlockContent} />
);
