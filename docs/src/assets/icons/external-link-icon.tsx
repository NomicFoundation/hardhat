import * as React from "react";
import { SVGProps } from "react";

const ExternalLinkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    fill="none"
  >
    <path d="M15 15.6733H4.99997V5.67334" />
    <path d="M7.84506 12.8298L14.5237 6.14941" />
    <path d="M10.113 6.14941H14.5234V10.5618" />
  </svg>
);

export default ExternalLinkIcon;
