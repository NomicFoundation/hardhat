import React from "react";
import Link from "next/link";
import { FooterNavigation } from "./types";

type Props = FooterNavigation;

const DocumentationFooter = ({ next, prev, lastEditDate, editLink }: Props) => {
  const date = lastEditDate ? new Date(lastEditDate).toLocaleString() : "";
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        padding: "100px 8px",
      }}
    >
      {prev?.href !== undefined ? (
        <div>
          <Link href={prev.href}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a>
              <span>{"<<<"}</span>
              {prev.label}
            </a>
          </Link>
        </div>
      ) : null}
      {editLink ? (
        <div>
          <a href={editLink} target="_blank" rel="noopener noreferrer">
            Help us improve this page
          </a>
        </div>
      ) : null}
      {date ? <div>{`Last Updated: ${date}`}</div> : null}
      {next?.href !== undefined ? (
        <div>
          <Link href={next.href}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a>
              {next.label}
              <span>{">>>"}</span>
            </a>
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default DocumentationFooter;
