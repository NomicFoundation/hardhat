import React from "react";
import { styled } from "linaria/react";
import { tm } from "../../themes";

const A = styled.a`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 12px 28px;
  border-radius: 4px;
  width: fit-content;
  background: ${tm(({ colors }) => colors.accentBackground)};
`;

type Props = React.PropsWithChildren<{ href: string }>;

const CTA = ({ children, href }: Props) => {
  return <A href={href}>{children}</A>;
};

export default CTA;
