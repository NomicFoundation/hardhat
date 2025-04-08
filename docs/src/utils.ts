export default function getImage(card: any, screenWidth: number, type: string) {
  const isDesktop = screenWidth >= 1700;
  const isLaptop = screenWidth >= 1280;

  if (type === "light") {
    if (isDesktop) return card.image.lg;
    if (isLaptop) return card.image.m;
    return card.image.md;
  }

  if (isDesktop) return card.imageDark.lg;
  if (isLaptop) return card.imageDark.m;
  return card.imageDark.md;
}
