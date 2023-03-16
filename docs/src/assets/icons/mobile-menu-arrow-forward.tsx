import * as React from "react";
import { SVGProps } from "react";

const MobileMenuArrowForward = (props: SVGProps<SVGSVGElement>) => (
  <svg width={16} height={16} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="m9 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 7.5a.5.5 0 0 0 0 1v-1Zm12 0H2v1h12v-1Z" />
  </svg>
);

export default MobileMenuArrowForward;
