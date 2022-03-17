import React from 'react';
import { styled } from 'linaria/react';
import SEO from './SEO';
import LandingNavigation from './LandingNavigation';
import LandingFooter from './LandingFooter';
import Banner from './ui/Banner';

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  main {
    padding-top: 96px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background-color: aqua;
  }
  height: 100vh;
  min-width: 320px;
`;

type Props = React.PropsWithChildren<{
  seo: {
    title: string;
  };
}>;

const LandingLayout = ({ children, seo }: Props) => {
  return (
    <Container>
      <Banner />
      <LandingNavigation />
      <SEO seo={seo} />
      <main>{children}</main>
      <LandingFooter />
    </Container>
  );
};

export default LandingLayout;
