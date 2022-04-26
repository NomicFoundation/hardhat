import * as React from "react";
import { SVGProps } from "react";

const ExternalLinkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={20}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M15 15H5V5M7.845 12.157l6.679-6.68M10.113 5.476h4.41v4.412" />
  </svg>
);

export default ExternalLinkIcon;
