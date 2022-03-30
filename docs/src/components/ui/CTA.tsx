import React from "react";
import { styled } from "linaria/react";
import { tm, appTheme } from "../../themes";

const { media } = appTheme;

const A = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 10px 22px;
  border-radius: 4px;
  width: fit-content;
  font-size: 12px;
  line-height: 24px;
  letter-spacing: 0em;
  white-space: nowrap;
  text-align: center;
  color: ${tm(({ colors }) => colors.neutral900)};
  background: ${tm(({ colors }) => colors.accentBackground)};
  transition: all ease-out 0.3s;
  &:hover {
    filter: drop-shadow(0px 1px 2px rgba(10, 10, 10, 0.1))
      drop-shadow(0px 8px 30px rgba(184, 113, 255, 0.1));
  }
  ${media.lg} {
    font-size: 15px;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: center;
    padding: 12px 28px;
  }
`;

type Props = React.PropsWithChildren<{ href: string; variant?: string }>;

const CTA = ({ children, href, variant = "" }: Props) => {
  return (
    <A className={variant} href={href}>
      {children}
    </A>
  );
};

export default CTA;
