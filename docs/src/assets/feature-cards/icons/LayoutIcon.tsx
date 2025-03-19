import * as React from "react";
import { SVGProps } from "react";

const LayoutIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="37"
    height="46"
    viewBox="0 0 37 46"
    fill="none"
    className="feature-icon"
    {...props}
  >
    <rect
      x="0.500977"
      y="45.3506"
      width="27.5"
      height="35.8262"
      transform="rotate(-90 0.500977 45.3506)"
    />
    <rect
      x="0.500977"
      y="12.8506"
      width="11.5"
      height="35.8262"
      transform="rotate(-90 0.500977 12.8506)"
    />
  </svg>
);
export default LayoutIcon;
