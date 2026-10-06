export const artworks = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  title: `Nailong ${String(index + 1).padStart(2, '0')}`,
  image: `/images/nailong-${String(index + 1).padStart(2, '0')}.png`,
  description: 'A familiar little dragon, in an unfamiliar world. Part of a collection of twenty playful portraits exploring imagination, art, and the extraordinary in the everyday.',
}));
