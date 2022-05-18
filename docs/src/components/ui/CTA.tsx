import React from "react";
import { styled } from "linaria/react";
import { media, tm } from "../../themes";

const A = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 22px;
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
  &:hover {
    background-color: ${tm(({ colors }) => colors.accent200)};
  }
  ${media.md} {
    font-size: 15px;
    line-height: 24px;
    letter-spacing: 0;
    text-align: center;
    padding: 12px 28px;
  }

  &.secondary {
    width: 100%;
    padding: 12px 0;
    border: 1px solid ${tm(({ colors }) => colors.neutral700)};
    text-align: center;
    background: ${tm(({ colors }) => colors.transparent)};
    transition: 0.3s;

    &:hover {
      border-color: ${tm(({ colors }) => colors.transparent)};
      background-color: ${tm(({ colors }) => colors.secondaryCTAHover)};
    }
  }
`;

type Props = React.PropsWithChildren<{
  href: string;
  variant?: string;
}>;

const CTA = ({ children, href, variant = "" }: Props) => {
  return (
    <A className={variant} href={href}>
      {children}
    </A>
  );
};

export default CTA;
