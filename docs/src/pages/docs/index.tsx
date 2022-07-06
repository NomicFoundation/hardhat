import type { GetStaticProps, NextPage } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { styled } from "linaria/react";
import PluginsLayout from "../../components/PluginsLayout";
import { components } from "../../components/DocumentationLayout";
import {
  prepareMdContent,
  readMDFileFromPathOrIndex,
} from "../../model/markdown";
import { DOCS_LANDING_PATH } from "../../config";
import { media, tm, tmDark, tmSelectors } from "../../themes";

interface IDocsPage {
  mdxSource: MDXRemoteSerializeResult;
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

const Docs: NextPage<IDocsPage> = ({ mdxSource }) => {
  return (
    <PluginsLayout
      seo={{
        title: "Hardhat Documentation",
        description: "Documentation of all the Hardhat projects",
      }}
      sidebarLayout={[]}
    >
      <div>
        <PageTitle>Hardhat documentation</PageTitle>
        {/* @ts-ignore */}
        <MDXRemote {...mdxSource} components={components} />
      </div>
    </PluginsLayout>
  );
};

export default Docs;

export const getStaticProps: GetStaticProps = async () => {
  const { source } = readMDFileFromPathOrIndex(`${DOCS_LANDING_PATH}/index.md`);
  const { mdxSource } = await prepareMdContent(source);

  return {
    props: {
      mdxSource,
    },
  };
};
