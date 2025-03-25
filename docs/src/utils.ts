export default function getImage(card: any, screenWidth: number, type: string) {
  const isLarge = screenWidth > 1279;

  if (type === "light") {
    if (isLarge) return card.image.lg;
    return card.image.md;
  }

  if (isLarge) return card.imageDark.lg;
  return card.imageDark.md;
}
