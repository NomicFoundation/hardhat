import type { GetStaticProps, NextPage } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { styled } from "linaria/react";
import PluginsLayout from "../../components/PluginsLayout";
import { components } from "../../components/DocumentationLayout";
import {
  getLayout,
  prepareMdContent,
  readMDFileFromPathOrIndex,
} from "../../model/markdown";
import { DOCS_LANDING_PATH } from "../../config";
import { media, tmDark, tmSelectors } from "../../themes";
import { createLayouts } from "../../model/layout";
import { IDocumentationSidebarStructure } from "../../components/types";

interface IDocsPage {
  mdxSource: MDXRemoteSerializeResult;
  layout: IDocumentationSidebarStructure;
}

const PageTitle = styled.h3`
  margin-top: 28px;
  font-size: 42px;
  font-weight: 700;
  line-height: 45px;
  letter-spacing: 0.5px;
  padding-bottom: 24px;
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const Docs: NextPage<IDocsPage> = ({ mdxSource, layout }) => {
  return (
    <PluginsLayout
      seo={{
        title: "Documentation",
        description:
          "Documentation about Hardhat, the Ethereum development environment",
      }}
      sidebarLayout={layout}
    >
      <div>
        <PageTitle>Documentation</PageTitle>
        {/* @ts-ignore */}
        <MDXRemote {...mdxSource} components={components} />
      </div>
    </PluginsLayout>
  );
};

export default Docs;

export const getStaticProps: GetStaticProps = async () => {
  createLayouts();
  const { source } = readMDFileFromPathOrIndex(`${DOCS_LANDING_PATH}/index.md`);
  const { mdxSource } = await prepareMdContent(source);
  const { layout } = getLayout("hardhat-runner/docs/getting-started/index.md");

  return {
    props: {
      mdxSource,
      layout,
    },
  };
};
