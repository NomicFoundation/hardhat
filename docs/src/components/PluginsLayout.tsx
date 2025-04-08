import React, { useEffect, useRef, useState } from "react";
import { styled } from "linaria/react";
import { useRouter } from "next/router";

import SEO from "./SEO";
import DocsNavigation from "./DocsNavigation";
import Banner, { DefaultBanner } from "./ui/Banner";
import { tm, tmSelectors, tmDark, media, ThemeProvider } from "../themes";
import { DefaultBannerProps } from "./ui/types";
import { IDocumentationSidebarStructure, ISeo } from "./types";
import { bannerContent, menuItemsList, socialsItems } from "../config";
import {
  Header,
  MobileSidebarMenuMask,
  SidebarContainer,
} from "./DocumentationLayout";
import MobileSidebarMenu from "./MobileSidebarMenu";

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  height: 100vh;
  min-width: 320px;
`;

const Main = styled.main`
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  background-color: ${tm(({ colors }) => colors.neutral0)};
  width: 100%;
  position: relative;
  transition: background-color ease-in-out 0.25s;

  ${tmSelectors.dark} {
    background-color: ${tmDark(({ colors }) => colors.neutral0)};
  }
  ${media.mqDark} {
    ${tmSelectors.auto} {
      background-color: ${tmDark(({ colors }) => colors.neutral0)};
    }
  }
  ${media.laptop} {
    & aside {
      display: none;
    }
  }
`;

const View = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 24px;
  width: 100%;
  height: calc(100vh - 136px);
  overflow-y: scroll;
`;
const Content = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 774px;
  padding: 0 34px;
  color: ${tm(({ colors }) => colors.neutral900)};
  & h2:not(:first-of-type) {
    padding-top: 80px;
  }

  & h2 + p {
    margin-top: 32px;
  }

  color: ${tm(({ colors }) => colors.neutral900)};

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral900)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral900)};
    }
  }
`;

type Props = React.PropsWithChildren<{
  seo: ISeo;
  sidebarLayout: IDocumentationSidebarStructure;
}>;

const PluginsLayout = ({ children, seo, sidebarLayout }: Props) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pluginsViewRef = useRef() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    pluginsViewRef.current.scrollTo(0, 0);
  }, [router.asPath]);

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
      <Container>
        <Header className={`${isSidebarOpen ? "is-sidebar-open" : ""}`}>
          <Banner
            content={bannerContent}
            renderContent={({ content }: DefaultBannerProps) => (
              <DefaultBanner content={content} />
            )}
          />
          <DocsNavigation
            isSidebarOpen={isSidebarOpen}
            onSidebarOpen={setIsSidebarOpen}
          />
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
          <View ref={pluginsViewRef}>
            <Content>{children}</Content>
          </View>
        </Main>
      </Container>
    </ThemeProvider>
  );
};

export default PluginsLayout;
