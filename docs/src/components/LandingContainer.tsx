import React from "react";
import { styled } from "linaria/react";
import { media } from "../themes";

const Container = styled.div`
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 0 16px;

  ${media.tablet} {
    max-width: 680px;
    padding: 0;
  }
  ${media.laptop} {
    max-width: 1128px;
  }
  ${media.desktop} {
    max-width: 1408px;
  }
`;

const LandingContainer = ({ children }: React.PropsWithChildren<{}>) => {
  return <Container>{children}</Container>;
};
export default LandingContainer;
