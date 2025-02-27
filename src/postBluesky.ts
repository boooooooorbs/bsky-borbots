import AtprotoAPI, { RichText } from 'npm:@atproto/api';
const { BskyAgent } = AtprotoAPI;
const service = 'https://bsky.social';
const agent = new BskyAgent({ service });
const identifier = Deno.env.get('BLUESKY_IDENTIFIER') || '';
const password = Deno.env.get('BLUESKY_PASSWORD') || '';
await agent.login({ identifier, password });

export default async ({
  rt,
  title,
  link,
  description,
  mimeType,
  image,
}: {
  rt: RichText;
  title: string;
  link: string;
  description: string;
  mimeType?: string;
  image?: Uint8Array;
}) => {
  const thumb = await (async () => {
    if (image instanceof Uint8Array && typeof mimeType === 'string') {
      // Enviar Imagem
      const uploadedImage = await agent.uploadBlob(image, {
        encoding: mimeType,
      });

      // Adiciona imagem ao objeto do Skeet
      return {
        $type: 'blob',
        ref: {
          $link: uploadedImage.data.blob.ref.toString(),
        },
        mimeType: uploadedImage.data.blob.mimeType,
        size: uploadedImage.data.blob.size,
      };
    }
  })();

  const postObj: Partial<AtprotoAPI.AppBskyFeedPost.Record> &
    Omit<AtprotoAPI.AppBskyFeedPost.Record, 'createdAt'> = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: link,
        title,
        description,
        thumb,
      },
    },
  };

  console.log(JSON.stringify(postObj, null, 2));
  await agent.post(postObj);
  console.log('post to Bluesky');
};
