import 'https://deno.land/std@0.193.0/dotenv/load.ts';

import createProperties from './src/createProperties.ts';
import getItemList from './src/getItemList.ts';
import getOgp from './src/getOgp.ts';
import postBluesky from './src/postBluesky.ts';
import postWebhook from './src/postWebhook.ts';
import resizeImage from './src/resizeImage.ts';

// Obter lista de artigos do Feed RSS
const itemList = await getItemList();
console.log(JSON.stringify(itemList, null, 2)); // Pega os 2 posts mais recentes

// Termina, se não houver alvo
if (!itemList.length) {
  console.log('Nada de novo por aqui. Circulando...');
  Deno.exit(0);
}

// Dá uma olhada na lista de artigos recuperados
for await (const item of itemList) {
  // Atualizar a hora da última execução
  const timestamp = item.published
    ? new Date(item.published).toISOString()
    : new Date().toISOString();
  await Deno.writeTextFile('.timestamp', timestamp);

  // Cria as propriedades do post
  const { bskyText, xText, title, link, description } = await createProperties(
    item
  );

  // Obter OGP do URL
  const og = await getOgp(link);

  // Redimensionar imagem
  const { mimeType, resizedImage } = await (async () => {
    const ogImage = og.ogImage?.at(0);
    if (!ogImage) {
      console.log('ogp image not found');
      return {};
    }
    return await resizeImage(new URL(ogImage.url, link).href);
  })();

  // Postando no Bluesky
  await postBluesky({
    rt: bskyText,
    title,
    link,
    description: description || og.ogDescription || '',
    mimeType,
    image: resizedImage,
  });

  // Publique no Twitter usando IFTTT
  await postWebhook(xText);
}
