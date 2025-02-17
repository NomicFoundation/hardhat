import React from "react";
import { styled } from "linaria/react";

const Container = styled.div`
  width: 100%;
  max-width: 1408px;
  margin: 0 auto;
`;

const LandingContainer = ({ children }: React.PropsWithChildren<{}>) => {
  return <Container>{children}</Container>;
};
export default LandingContainer;
