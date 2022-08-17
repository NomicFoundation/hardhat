import * as React from "react";
import { SVGProps } from "react";

const MobileMenuArrowBack = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M7 13L2 8L7 3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 8.5C14.2761 8.5 14.5 8.27614 14.5 8C14.5 7.72386 14.2761 7.5 14 7.5L14 8.5ZM2 8.5L14 8.5L14 7.5L2 7.5L2 8.5Z" />
  </svg>
);

export default MobileMenuArrowBack;
