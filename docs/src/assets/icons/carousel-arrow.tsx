import * as React from "react";
import { SVGProps } from "react";

const CarouselArrow = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={11}
    height={19}
    viewBox="0 0 11 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9.62352 0.875977L1.44727 9.31116L9.62352 17.7463"
      stroke="#9B9FA8"
      strokeWidth={2}
    />
  </svg>
);

export default CarouselArrow;
