import type { NextPage, GetStaticProps, GetStaticPaths } from "next";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import DocumentationLayout from "../../../components/DocumentationLayout";
import {
  IDocumentationSidebarStructure,
  IFooterNavigation,
} from "../../../components/types";
import { createLayouts } from "../../../model/layout";
import { getLayout, prepareMdContent } from "../../../model/markdown";
import { getPluginMDSource, getPluginsPaths } from "../../../model/plugins";
import { IFrontMatter } from "../../../model/types";

interface Props {
  mdxSource: MDXRemoteSerializeResult;
  frontMatter: IFrontMatter;
  layout: IDocumentationSidebarStructure;
  prev: IFooterNavigation;
  next: IFooterNavigation;
  lastEditDate: string;
  editLink: string;
}

const PluginPage: NextPage<Props> = ({
  mdxSource,
  layout,
  frontMatter,
  prev,
  next,
  lastEditDate,
  editLink,
}): JSX.Element => {
  return (
    <DocumentationLayout
      mdxSource={mdxSource}
      seo={{
        title: frontMatter.seoTitle,
        description: frontMatter.seoDescription,
      }}
      sidebarLayout={layout}
      footerNavigation={{ prev, next, lastEditDate, editLink }}
    />
  );
};

export default PluginPage;

export const getStaticProps: GetStaticProps = async (props) => {
  const pluginSlug = props?.params?.plugin as string;
  const pluginName = pluginSlug
    .replace("/hardhat-runner/plugins/", "")
    .replace(/nomiclabs-/, "@nomiclabs/")
    .replace(/nomicfoundation-/, "@nomicfoundation/");

  const source = getPluginMDSource(pluginSlug);

  const { mdxSource, data, seoTitle, seoDescription } = await prepareMdContent(
    source
  );
  const { layout, next, prev } = getLayout(pluginName);

  return {
    props: {
      mdxSource,
      frontMatter: {
        ...data,
        seoTitle,
        seoDescription,
      },
      layout,
      next,
      prev,
    },
  };
};
export const getStaticPaths: GetStaticPaths = async () => {
  createLayouts();
  const paths = getPluginsPaths();

  return {
    paths,
    fallback: false,
  };
};
