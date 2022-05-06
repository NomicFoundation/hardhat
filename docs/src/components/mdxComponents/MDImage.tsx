// @ts-nocheck
import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";

interface Props {
  src: string;
  alt: string;
}

// TODO: solve the issue with badges
const ImageContainer = styled.div`
  max-width: 100%;
  position: relative;
  width: ${({ width }) => width};
  img {
    width: ${({ width }) => width};
    height: auto;
  }
  & .md-img {
    position: relative !important;
    height: unset !important;
  }
  & span {
    padding: 0 !important;
  }

  span & div {
    width: 120px !important;
  }
`;

const isShellBadge = (src: string): boolean => /img\.shields\.io/.test(src);
const isHardhatBadge = (alt: string): boolean => alt === "hardhat";

const MDImage = ({ src, alt }: Props) => {
  const isBadge = isShellBadge(src) || isHardhatBadge(alt);
  return (
    <ImageContainer width={isBadge ? "80px" : null}>
      <Image
        className="md-img"
        src={src}
        alt={alt}
        placeholder="blur"
        blurDataURL={src}
        width="100%"
        height="100%"
        quality={100}
        layout="responsive"
        objectFit="contain"
      />
    </ImageContainer>
  );
};

export default MDImage;
