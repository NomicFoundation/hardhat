import React from "react";
import Link from "next/link";
import { FooterNavigation } from "./types";

type Props = FooterNavigation;

const DocumentationFooter = ({ next, prev }: Props) => {
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
