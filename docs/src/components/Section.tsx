import React from "react";
import { styled } from "linaria/react";

const Container = styled.section`
  width: 100%;
  padding: 60px 0;
`;

type Props = React.PropsWithChildren<{}>;

const Section = ({ children }: Props) => {
  return <Container>{children}</Container>;
};

export default Section;
