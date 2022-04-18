import * as React from "react";
import { SVGProps } from "react";

const ThemeSwitcher = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={32}
    height={24}
    viewBox="0 0 30 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g filter="url(#filter0_d_4952_46671)">
      <rect
        x={6.48999}
        y={3.49756}
        width={19.01}
        height={19.01}
        rx={9.505}
        fill="#6C6F74"
      />
    </g>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.9939 21.403C15.9944 21.403 15.9949 21.403 15.9955 21.403C20.6346 21.403 24.3955 17.6422 24.3955 13.003C24.3955 8.36384 20.6346 4.60303 15.9955 4.60303C15.9949 4.60303 15.9944 4.60303 15.9939 4.60303V21.403Z"
      fill="#FBFBFB"
    />
    <defs>
      <filter
        id="filter0_d_4952_46671"
        x={0.153323}
        y={0.329225}
        width={31.6833}
        height={31.6831}
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy={3.16833} />
        <feGaussianBlur stdDeviation={3.16833} />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0.137255 0 0 0 0 0.0431373 0 0 0 0.1 0"
        />
        <feBlend
          mode="normal"
          in2="BackgroundImageFix"
          result="effect1_dropShadow_4952_46671"
        />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="effect1_dropShadow_4952_46671"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);

export default ThemeSwitcher;
