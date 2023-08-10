import 'https://deno.land/std@0.193.0/dotenv/load.ts';

import createProperties from './src/createProperties.ts';
import getItemList from './src/getItemList.ts';
import getOgp from './src/getOgp.ts';
import postBluesky from './src/postBluesky.ts';
import resizeImage from './src/resizeImage.ts';

// Obtém a lista de artigos do feed RSS
const itemList = await getItemList();
console.log(JSON.stringify(itemList, null, 2));

// Se não houver nenhum item, desencana
if (!itemList.length) {
  console.log('not found feed item');
  Deno.exit(0);
}

// Dá uma olhada nos itens de artigo recuperados
for await (const item of itemList) {
  // Atualize a hora de execução final
  const timestamp = item.published
    ? new Date(item.published).toISOString()
    : new Date().toISOString();
  await Deno.writeTextFile('.timestamp', timestamp);

  // Crie as propriedades do Skeet
  const { text, facets, link } = await createProperties(item);

  // Pega o OGP do URL
  const og = await getOgp(link);

  // Redimensione as imagens
  let images;
  for (const ogImage of og.ogImage || []) {
    const { mimeType, resizedImage } = await resizeImage(
      new URL(ogImage.url, link).href
    );
    if (mimeType && resizedImage)
      images = [...(images || []), { mimeType, image: resizedImage }];
  }

  // Posta no Bluesky!
  await postBluesky({
    text,
    facets,
    images,
  });
}
