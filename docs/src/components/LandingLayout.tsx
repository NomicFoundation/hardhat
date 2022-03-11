import React from "react";
import { styled } from "linaria/react";
import SEO from "./SEO";
import LandingNavigation from "./LandingNavigation";
import LandingFooter from "./LandingFooter";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  main {
    height: 100px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow-y: auto;
    background-color: aqua;
  }
  height: 100vh;
  min-width: 320px;
`;

type Props = React.PropsWithChildren<{
  seo: {};
}>;

const LandingLayout = ({ children, seo }: Props) => {
  return (
    <Container>
      <LandingNavigation />
      <SEO seo={seo} />
      <main>{children}</main>
      <LandingFooter />
    </Container>
  );
};

export default LandingLayout;
