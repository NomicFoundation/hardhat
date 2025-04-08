import React from "react";
import { styled } from "linaria/react";
import { media, tm, tmDark, tmSelectors } from "../../themes";

const A = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 0 28px;
  border: none;
  height: 44px;
  border-radius: 0;
  width: fit-content;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  font-family: Roboto, sans-serif;
  letter-spacing: 0.03em;
  white-space: nowrap;
  text-align: center;
  color: ${tm(({ colors }) => colors.base100)};
  background-color: ${tm(({ colors }) => colors.accent800)};
  transition: all ease-out 0.3s;
  cursor: pointer;
  &:hover {
    background-color: ${tm(({ colors }) => colors.base100)};
    color: ${tm(({ colors }) => colors.accent800)};
    ${tmSelectors.dark} {
      background-color: ${tm(({ colors }) => colors.neutral200)};
      color: ${tm(({ colors }) => colors.gray9)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        background-color: ${tm(({ colors }) => colors.neutral200)};
        color: ${tm(({ colors }) => colors.gray9)};
      }
    }
  }

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.accent800)};
    color: ${tm(({ colors }) => colors.gray9)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.accent800)};
      color: ${tm(({ colors }) => colors.gray9)};
    }
  }

  &.secondary {
    width: 100%;
    border: 1px solid ${tm(({ colors }) => colors.gray5)};
    text-align: center;
    background-color: ${tm(({ colors }) => colors.transparent)};
    transition: 0.3s;
    outline: 1px solid ${tm(({ colors }) => colors.transparent)};
    color: ${tm(({ colors }) => colors.gray8b)};
    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.gray4)};
      border-color: ${tm(({ colors }) => colors.gray5)};
      background-color: ${tmDark(({ colors }) => colors.transparent)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.gray4)};
        border-color: ${tm(({ colors }) => colors.gray5)};
        background-color: ${tmDark(({ colors }) => colors.transparent)};
      }
    }

    &:hover {
      border-color: ${tm(({ colors }) => colors.gray8b)};
      color: ${tm(({ colors }) => colors.gray8b)};
      outline: 1px solid ${tm(({ colors }) => colors.gray8b)};
      background-color: ${tm(({ colors }) => colors.transparent)};
      ${tmSelectors.dark} {
        color: ${tmDark(({ colors }) => colors.gray2)};
        background-color: ${tmDark(({ colors }) => colors.transparent)};
        border-color: ${tm(({ colors }) => colors.gray5)};
        outline: 1px solid ${tm(({ colors }) => colors.gray5)};
      }
      ${media.mqDark} {
        ${tmSelectors.auto} {
          color: ${tmDark(({ colors }) => colors.gray2)};
          background-color: ${tmDark(({ colors }) => colors.transparent)};
          border-color: ${tm(({ colors }) => colors.gray5)};
          outline: 1px solid ${tm(({ colors }) => colors.gray5)};
        }
      }
    }
  }
  &.primary {
    background-color: ${tm(({ colors }) => colors.gray2)};
    border: none;
    color: ${tm(({ colors }) => colors.gray8b)};
    .icon {
      color: ${tm(({ colors }) => colors.accent700)};
    }
    ${tmSelectors.dark} {
      color: ${tmDark(({ colors }) => colors.gray4)};
      background-color: ${tmDark(({ colors }) => colors.gray3)};
    }
    ${media.mqDark} {
      ${tmSelectors.auto} {
        color: ${tmDark(({ colors }) => colors.gray4)};
        background-color: ${tmDark(({ colors }) => colors.gray3)};
      }
    }
    &:hover {
      background-color: ${tm(({ colors }) => colors.violet500)};
      color: ${tm(({ colors }) => colors.gray1)};
      .icon {
        color: ${tm(({ colors }) => colors.gray3)};
      }
    }
  }

  &.full-padding {
    padding: 0 28px;
  }
  &.sm {
    height: 36px;
  }
  &.lg {
    height: 56px;
    font-size: 14px;
  }
  &.xl {
    height: 64px;
    font-size: 16px;
  }
`;

type Props = React.PropsWithChildren<{
  href?: string;
  variant?: string;
  disabled?: boolean;
  onClick?:
    | (() => void)
    | React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
}>;

const CTA = ({ children, href, variant = "", onClick, disabled }: Props) => {
  if ((href === "" || href === undefined || href === null) && !onClick) {
    throw new Error("CTA should have a href prop or a onClick prop");
  }
  return (
    <A
      as={onClick ? "button" : "a"}
      className={variant}
      href={href ?? undefined}
      onClick={onClick ?? undefined}
      {...(onClick ? { disabled } : {})}
    >
      {children}
    </A>
  );
};

export default CTA;
