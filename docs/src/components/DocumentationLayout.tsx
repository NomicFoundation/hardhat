import React from "react";
import { styled } from "linaria/react";
import SEO from "./SEO";
import Navigation from "./Navigation";
import Banner, { DefaultBanner } from "./ui/Banner";
import { tm, appTheme } from "../themes";
import defaultProps from "./ui/default-props";
import { DefaultBannerProps } from "./ui/types";
import { ISeo } from "./types";

const { defaultBannerContent } = defaultProps;
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

const Sidebar = styled.aside`
  flex-direction: column;
  border-right: 1px solid ${tm(({ colors }) => colors.neutral400)};
  width: 366px;
  position: fixed;
  left: 0px;
  top: 0px;
  height: 100vh;
  display: none;
  ${media.lg} {
    display: flex;
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
  ${media.lg} {
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
  return (
    <Container>
      <Banner
        content={defaultBannerContent}
        renderContent={({ content }: DefaultBannerProps) => (
          <DefaultBanner content={content} />
        )}
      />
      <Navigation />
      <SEO seo={seo} />

      <main>
        <Sidebar />
        <View>
          <Content>{children}</Content>
        </View>
      </main>
    </Container>
  );
};

export default DocumentationLayout;
