import React, { useEffect, useState } from "react";
import { styled } from "linaria/react";
import SEO from "./SEO";
import Navigation from "./Navigation";
import Banner, { DefaultBanner } from "./ui/Banner";
import { tm, appTheme } from "../themes";
import { DefaultBannerProps } from "./ui/types";
import { ISeo } from "./types";
import Sidebar from "./Sidebar";
import {
  DocumentationSidebarStructure,
  menuItemsList,
  socialsItems,
  bannerContent,
} from "../config";
import MobileSidebarMenu from "./MobileSidebarMenu";

const { media } = appTheme;

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  main {
    flex: 1 1 auto;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    background-color: ${tm(({ colors }) => colors.neutral0)};
    width: 100%;
    position: relative;
  }
  height: 100vh;
  min-width: 320px;
`;

const SidebarMask = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
`;
const MobileSidebarMenuMask = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  width: 100%;
  left: -100%;
  top: 0px;
  transition: all 0.25s ease-in-out;
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  &[data-open="true"] {
    left: 0px;
  }
`;

const SidebarContainer = styled.aside`
  flex-direction: column;
  width: 366px;
  position: fixed;
  left: 0px;
  top: 136px;
  height: 85vh;
  display: flex;
  overflow-y: scroll;
  z-index: 1;
  ${SidebarMask} {
    display: none;
    ${media.md} {
      display: flex;
    }
  }
  ${MobileSidebarMenuMask} {
    display: flex;
    ${media.md} {
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
  height: 85vh;
  overflow-y: scroll;
  ${media.md} {
    padding-left: 366px;
  }
`;
const Content = styled.section`
  display: flex;
  flex-direction: column;
  max-width: 774px;
  padding-left: 34px;
`;

type Props = React.PropsWithChildren<{
  seo: ISeo;
}>;

const DocumentationLayout = ({ children, seo }: Props) => {
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
    <Container>
      <Banner
        content={bannerContent}
        renderContent={({ content }: DefaultBannerProps) => (
          <DefaultBanner content={content} />
        )}
      />
      <Navigation
        isSidebarOpen={isSidebarOpen}
        onSidebarOpen={setIsSidebarOpen}
      />
      <SEO seo={seo} />

      <main>
        <SidebarContainer
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <SidebarMask>
            <Sidebar elementsList={DocumentationSidebarStructure} />
          </SidebarMask>
          <MobileSidebarMenuMask data-open={isSidebarOpen}>
            <MobileSidebarMenu
              menuItems={menuItemsList}
              socialsItems={socialsItems}
              sidebarElementsList={DocumentationSidebarStructure}
            />
          </MobileSidebarMenuMask>
        </SidebarContainer>
        <View>
          <Content>{children}</Content>
        </View>
      </main>
    </Container>
  );
};

export default DocumentationLayout;
