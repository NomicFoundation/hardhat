import React from "react";
import { styled } from "linaria/react";

import SEO from "./SEO";
import LandingNavigation from "./LandingNavigation";
import LandingFooter from "./LandingFooter";
import Banner, { DefaultBanner } from "./ui/Banner";
import { ThemeProvider, tm } from "../themes";
import { DefaultBannerProps } from "./ui/types";
import { bannerContent } from "../config";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  -webkit-font-smoothing: antialiased;
  main {
    overflow-x: hidden;
    padding-top: 136px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    background-color: ${tm(({ colors }) => colors.neutral0)};
    width: 100%;
  }
  min-width: 320px;
`;

type Props = React.PropsWithChildren<{
  seo: {
    title: string;
    description: string;
  };
}>;

export const Header = styled.header`
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  z-index: 199;
`;

const LandingLayout = ({ children, seo }: Props) => {
  return (
    <ThemeProvider>
      <Container className="landing">
        <Header>
          <Banner
            content={bannerContent}
            renderContent={({ content }: DefaultBannerProps) => (
              <DefaultBanner content={content} />
            )}
          />
          <LandingNavigation />
        </Header>

        <SEO seo={seo} />
        <main>
          {children}
          <LandingFooter />
        </main>
      </Container>
    </ThemeProvider>
  );
};

export default LandingLayout;
