import React from "react";
import Image from "next/image";
import { styled } from "linaria/react";

interface Props {
  src: string;
  alt: string;
}

const ImageContainer = styled.div`
  max-width: 100%;
  position: relative;
  height: auto;
  & .md-img {
    position: relative !important;
    height: unset !important;
  }
  & span {
    padding: 0 !important;
  }
`;

const MDImage = ({ src, alt }: Props) => {
  return (
    <ImageContainer>
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
