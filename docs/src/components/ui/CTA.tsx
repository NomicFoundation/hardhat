import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../../themes";

const A = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 22px;
  border: none;
  border-radius: 4px;
  width: fit-content;
  font-size: 12px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: 0;
  white-space: nowrap;
  text-align: center;
  color: ${tm(({ colors }) => colors.neutral900)};
  background-color: ${tm(({ colors }) => colors.accent800)};
  transition: all ease-out 0.3s;
  cursor: pointer;
  &:hover {
    background-color: ${tm(({ colors }) => colors.accent300)};
    ${tmSelectors.dark} {
      background-color: ${tmDark(({ colors }) => colors.accent300)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        background-color: ${tmDark(({ colors }) => colors.accent300)};
      }
    }
  }
  ${media.md} {
    font-size: 15px;
    line-height: 24px;
    letter-spacing: 0;
    text-align: center;
    padding: 12px 28px;
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.accent800)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.accent800)};
    }
  }

  &.secondary {
    width: 100%;
    border: 1px solid ${tm(({ colors }) => colors.neutral700)};
    text-align: center;
    background-color: ${tm(({ colors }) => colors.transparent)};
    transition: 0.3s;

    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
      border-color: ${tmDark(({ colors }) => colors.neutral700)};
      background-color: ${tmDark(({ colors }) => colors.transparent)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.neutral900)};
        border-color: ${tmDark(({ colors }) => colors.neutral700)};
        background-color: ${tmDark(({ colors }) => colors.transparent)};
      }
    }

    &:hover {
      border-color: ${tm(({ colors }) => colors.transparent)};
      background-color: ${tm(({ colors }) => colors.secondaryCTAHover)};
      ${tmSelectors.dark} {
        background-color: ${tmDark(({ colors }) => colors.secondaryCTAHover)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          background-color: ${tmDark(({ colors }) => colors.secondaryCTAHover)};
        }
      }
    }
  }
  &.primary {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 19px 24px;
    background-color: #e5e6e7;
    color: #181a1f;
    font-size: 16px;
    font-weight: 600;
    font-family: Roboto, sans-serif;
    line-height: 1.5;
    letter-spacing: 0.02em;
    border-radius: 0;
    .icon {
      color: #ccb200;
    }
    &:hover {
      background-color: #5e21ff;
      color: #fbfbfb;
      .icon {
        color: #d2d3d5;
      }
    }
  }

  &.full-padding {
    padding: 12px 28px;
  }
  &.md {
    padding: 16px 28px;
    font-size: 16px;
    font-weight: 600;
    font-family: Roboto, sans-serif;
  }
`;

type Props = React.PropsWithChildren<{
  href?: string;
  variant?: string;
  onClick?: () => void;
}>;

const CTA = ({ children, href, variant = "", onClick }: Props) => {
  if ((href === "" || href === undefined || href === null) && !onClick) {
    throw new Error("CTA should have a href prop or a onClick prop");
  }
  return (
    <A
      as={onClick ? "button" : "a"}
      className={variant}
      href={href ?? undefined}
      onClick={onClick ?? undefined}
    >
      {children}
    </A>
  );
};

export default CTA;
