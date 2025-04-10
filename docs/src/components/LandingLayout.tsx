import React, { useEffect, useState } from "react";
import { styled } from "linaria/react";

import SEO from "./SEO";
import LandingFooter from "./LandingFooter";
import {
  headerTotalHeight,
  media,
  ThemeProvider,
  tm,
  tmDark,
  tmSelectors,
} from "../themes";
import { menuItemsList, socialsItems } from "../config";
import GDPRNotice from "./GDPRNotice";
import DocsNavigation from "./DocsNavigation";
import {
  Header,
  MobileSidebarMenuMask,
  SidebarContainer,
} from "./DocumentationLayout";
import MobileSidebarMenu from "./MobileSidebarMenu";
import { IDocumentationSidebarStructure, ISeo } from "./types";
import AlphaBanner from "./ui/AlphaBanner";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  -webkit-font-smoothing: antialiased;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  transition: all ease-in-out 0.25s;
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
  padding-top: ${headerTotalHeight};
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
`;

type Props = React.PropsWithChildren<{
  seo: ISeo;
  sidebarLayout: IDocumentationSidebarStructure;
}>;

const LandingLayout = ({ children, seo, sidebarLayout }: Props) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const body = document.querySelector("body");
    if (!body) return;

    if (isSidebarOpen) {
      // Disable scroll
      body.style.overflow = "hidden";
    } else {
      // Enable scroll
      body.style.overflow = "auto";
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const listener = () => {
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("click", listener);

    return () => document.removeEventListener("click", listener);
  }, [isSidebarOpen]);
  return (
    <ThemeProvider>
      <Container className="landing">
        <Header>
          <DocsNavigation
            isSidebarOpen={isSidebarOpen}
            onSidebarOpen={setIsSidebarOpen}
          />
          <AlphaBanner />
        </Header>

        <SEO seo={seo} />
        <Main>
          <SidebarContainer
            onClick={(e) => {
              e.stopPropagation();
            }}
            isSidebarOpen={isSidebarOpen}
            data-no-border={!isSidebarOpen && sidebarLayout.length === 0}
          >
            <MobileSidebarMenuMask data-open={isSidebarOpen}>
              <MobileSidebarMenu
                menuItems={menuItemsList}
                socialsItems={socialsItems}
                sidebarElementsList={sidebarLayout}
                closeSidebar={() => setIsSidebarOpen(false)}
                isDocumentation={false}
              />
            </MobileSidebarMenuMask>
          </SidebarContainer>
          {children}
          <LandingFooter />
        </Main>
      </Container>
      <GDPRNotice />
    </ThemeProvider>
  );
};

export default LandingLayout;
