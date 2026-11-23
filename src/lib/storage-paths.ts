/** Consistent object layout in the private "wardrobe" bucket: <user_id>/<item_id>/<file> */
export const itemPaths = (userId: string, itemId: string) => ({
  original: `${userId}/${itemId}/original.jpg`,
  processed: `${userId}/${itemId}/processed.png`,
  thumb: `${userId}/${itemId}/thumb.webp`,
});

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
