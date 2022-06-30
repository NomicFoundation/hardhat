import React from "react";
import { styled } from "linaria/react";

import SEO from "./SEO";
import LandingNavigation from "./LandingNavigation";
import LandingFooter from "./LandingFooter";
import Banner, { DefaultBanner } from "./ui/Banner";
import { media, ThemeProvider, tm, tmDark, tmSelectors } from "../themes";
import { DefaultBannerProps } from "./ui/types";
import { bannerContent } from "../config";
import GDPRNotice from "./GDPRNotice";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  -webkit-font-smoothing: antialiased;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  min-width: 320px;
  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
`;

const Main = styled.main`
  overflow-x: hidden;
  padding-top: 136px;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
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
        <Main>
          {children}
          <LandingFooter />
        </Main>
      </Container>
      <GDPRNotice />
    </ThemeProvider>
  );
};

export default LandingLayout;
