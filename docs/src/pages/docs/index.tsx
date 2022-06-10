import type { GetStaticProps, NextPage } from "next";
import { styled } from "linaria/react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import PluginsLayout from "../../components/PluginsLayout";
import { media, tm, tmDark, tmSelectors } from "../../themes";
import { components } from "../../components/DocumentationLayout";
import {
  prepareMdContent,
  readMDFileFromPathOrIndex,
} from "../../model/markdown";
import { DOCS_LANDING_PATH } from "../../config";

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
  border-bottom: 1px solid ${tm(({ colors }) => colors.border)};
  ${tmSelectors.dark} {
    border-bottom-color: ${tmDark(({ colors }) => colors.border)};
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      border-bottom-color: ${tmDark(({ colors }) => colors.border)};
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const SectionTitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 74px;
  margin-bottom: 32px;
  ${media.md} {
    align-items: center;
    flex-direction: row;
  }
`;

const SectionTitle = styled.h3`
  font-weight: 700;
  font-size: 24px;
  line-height: 1.25;
  letter-spacing: 0.5px;
  color: ${tm(({ colors }) => colors.neutral800)};
  & > a > span {
    margin-left: -24px;
    margin-right: 8px;
    opacity: 0;
    cursor: pointer;
    color: ${tm(({ colors }) => colors.accent700)};
  }
  &:hover > a > span {
    opacity: 1;
    &:hover {
      text-decoration: underline;
    }
  }
  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral800)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral800)};
    }
  }
`;

const SectionTitleDescription = styled.span`
  font-size: 16px;
  color: ${tm(({ colors }) => colors.neutral700)};
  margin-top: 8px;
  ${media.md} {
    padding-left: 10px;
  }

  ${tmSelectors.dark} {
    color: ${tmDark(({ colors }) => colors.neutral700)};
  }

  ${media.mqDark} {
    ${tmSelectors.auto} {
      color: ${tmDark(({ colors }) => colors.neutral700)};
    }
  }
`;

const Docs: NextPage<IDocsPage> = ({ mdxSource }) => {
  return (
    <PluginsLayout
      seo={{
        title: "Hardhat Documentation",
        description: "Hub for all the documentation related to Hardhat products",
      }}
      sidebarLayout={[]}
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
  const { source } = readMDFileFromPathOrIndex(`${DOCS_LANDING_PATH}/index.md`);
  const { mdxSource } = await prepareMdContent(source);

  return {
    props: {
      mdxSource,
    },
  };
};
