import React from "react";
import { styled } from "linaria/react";
import { tm } from "../../themes";

const A = styled.a`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 12px 28px;
  border-radius: 4px;
  background-color: ${tm(({ colors }) => colors.primary)};
`;

type Props = React.PropsWithChildren<{ href: string }>;

const CTA = ({ children, href }: Props) => {
  return <A href={href}>{children}</A>;
};

export default CTA;
