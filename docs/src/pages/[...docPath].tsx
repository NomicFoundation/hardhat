import type { NextPage, GetStaticProps, GetStaticPaths } from "next";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

import {
  getCommitDate,
  getEditLink,
  getLayout,
  getMDPaths,
  prepareMdContent,
  readMDFileFromPathOrIndex,
  withIndexFile,
} from "../model/markdown";
import DocumentationLayout from "../components/DocumentationLayout";
import { createLayouts } from "../model/layout";
import {
  IDocumentationSidebarStructure,
  IFooterNavigation,
} from "../components/types";
import { IFrontMatter } from "../model/types";

interface IDocPage {
  mdxSource: MDXRemoteSerializeResult;
  frontMatter: IFrontMatter;
  layout: IDocumentationSidebarStructure;
  prev: IFooterNavigation;
  next: IFooterNavigation;
  lastEditDate: string;
  editLink: string;
}

const DocPage: NextPage<IDocPage> = ({
  mdxSource,
  frontMatter,
  layout,
  prev,
  next,
  lastEditDate,
  editLink,
}): JSX.Element => {
  return (
    <DocumentationLayout
      seo={{
        title: frontMatter.seoTitle,
        description: frontMatter.seoDescription,
      }}
      sidebarLayout={layout}
      footerNavigation={{ prev, next, lastEditDate, editLink }}
      mdxSource={mdxSource}
    />
  );
};

export default DocPage;

export const getStaticProps: GetStaticProps = async (props) => {
  const { params } = props;
  // @ts-ignore
  const fullName = withIndexFile(params.docPath);
  const { source, fileName } = readMDFileFromPathOrIndex(fullName);
  const lastEditDate = getCommitDate(fileName);
  const editLink = getEditLink(fileName);

  const { mdxSource, data, seoTitle, seoDescription } = await prepareMdContent(
    source
  );
  const { layout, next, prev } = getLayout(fileName);

  return {
    props: {
      mdxSource,
      frontMatter: {
        ...data,
        seoTitle,
        seoDescription,
      },
      layout,
      next: data.next ? next : false,
      prev: data.prev ? prev : false,
      lastEditDate,
      editLink,
    },
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getMDPaths();
  createLayouts();

  return {
    paths,
    fallback: false,
  };
};
