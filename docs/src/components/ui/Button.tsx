import React from "react";
import { styled } from "linaria/react";
import { tm } from "../../themes";

interface Props {}

const Container = styled.button`
  padding: 26px;
`;

const H1 = styled.h1`
  padding: 16px;
  color: ${tm(({ colors }) => colors.neutral900)};
  background-color: darkcyan;
`;

const Button = (props: Props) => {
  return (
    <Container>
      <H1>Title</H1>
      Styled Button
    </Container>
  );
};

export default Button;
