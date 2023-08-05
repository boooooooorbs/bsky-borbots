import 'https://deno.land/std@0.193.0/dotenv/load.ts';
import { Image, GIF } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { parseFeed } from 'https://deno.land/x/rss@0.6.0/mod.ts';
import AtprotoAPI from 'npm:@atproto/api';
import ogs from 'npm:open-graph-scraper';

const lastExecutionTime = await Deno.readTextFile('.timestamp');
console.log(lastExecutionTime.trim());

// rss feedから記事リストを取得
const getItemList = async () => {
  const response = await fetch(Deno.env.get('RSS_URL') || '');
  const xml = await response.text();
  const feed = await parseFeed(xml);

  const foundList = feed.entries.reverse().filter((item) => {
    return (
      item.published &&
      new Date(lastExecutionTime.trim()) < new Date(item.published)
    );
  });
  // foundListの5件目までを返す
  return foundList.slice(0, 1);
};
const itemList = await getItemList();
console.log(JSON.stringify(itemList, null, 2));

// 対象がなかったら終了
if (!itemList.length) {
  console.log('not found feed item');
  Deno.exit(0);
}

// Blueskyに接続
const { BskyAgent, RichText } = AtprotoAPI;
const service = 'https://bsky.social';
const agent = new BskyAgent({ service });
const identifier = Deno.env.get('BLUESKY_IDENTIFIER') || '';
const password = Deno.env.get('BLUESKY_PASSWORD') || '';
await agent.login({ identifier, password });

// 取得した記事リストをループ処理
for await (const item of itemList) {
  // 最終実行時間を更新
  await Deno.writeTextFile(
    '.timestamp',
    item.published
      ? new Date(item.published).toISOString()
      : new Date().toISOString()
  );

  const title = item.title?.value || '';
  const link = item.links[0].href || '';

  // 投稿予定のテキストを作成
  const text = title;

  // URLからOGPの取得
  const getOgp = async (
    url: string
  ): Promise<{ images: { image: Uint8Array; type: string }[] }> => {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Twitterbot' },
    }).catch(() => {});

    // OGP取得のリクエストに失敗した場合は空オブジェクトを返す
    if (!res) {
      return {
        images: [],
      };
    }

    const html = await res.text();
    const { result } = await ogs({ html });
    console.log(JSON.stringify(result, null, 2));
    const ogImages = result.ogImage;

    // OGPに画像がない場合は空オブジェクトを返す
    if (!ogImages || ogImages.length === 0) {
      return {
        images: [],
      };
    }

    const images = [];
    for await (const ogImage of ogImages) {
      const response = await fetch(new URL(ogImage.url, link).href);
      const contentType = response.headers.get('content-type');

      // 画像が取得できなかった場合は空オブジェクトを返す
      if (!response.ok || !contentType?.includes('image')) {
        console.log('image not found');
        continue;
      }

      const buffer = await response.arrayBuffer();

      let type, resizedImage;
      try {
        // TODO: 画像を1MB以下になるまでリサイズしたい
        if (contentType.includes('gif')) {
          type = 'image/gif';
          const gif = await GIF.decode(buffer);
          resizedImage = await gif.encode();
        } else {
          type = 'image/jpeg';
          const image = await Image.decode(buffer);
          resizedImage =
            image.width < 1024 && image.height < 1024
              ? await image.encodeJPEG()
              : await image
                  .resize(
                    image.width >= image.height ? 1024 : Image.RESIZE_AUTO,
                    image.width < image.height ? 1024 : Image.RESIZE_AUTO
                  )
                  .encodeJPEG();
        }

        images.push({ image: resizedImage, type });
      } catch {
        console.log('image decode error');
        continue;
      }
    }

    return { images };
  };
  const og = await getOgp(link);

  const rt = new RichText({ text });
  await rt.detectFacets(agent);
  if (rt.text.length > 300) {
    // 300文字以上は投稿しない
    console.log('text too long');
    continue;
  }

  const postObj: Partial<AtprotoAPI.AppBskyFeedPost.Record> &
    Omit<AtprotoAPI.AppBskyFeedPost.Record, 'createdAt'> = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
  };

  const images = [];
  for await (const { image, type } of og.images) {
    // 画像をアップロード
    const uploadedImage = await agent.uploadBlob(image, {
      encoding: type,
    });

    images.push({
      image: {
        cid: uploadedImage.data.blob.ref.toString(),
        mimeType: uploadedImage.data.blob.mimeType,
      },
      alt: '',
    });
  }
  if (images.length > 0) {
    // 投稿オブジェクトに画像を追加
    postObj.embed = {
      $type: 'app.bsky.embed.images',
      images,
    };
  }

  console.log(JSON.stringify(postObj, null, 2));
  const result = await agent.post(postObj);
  console.log(JSON.stringify(result, null, 2));
}
