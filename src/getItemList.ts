import { parseFeed } from 'https://deno.land/x/rss@0.6.0/mod.ts';

const lastExecutionTime = await Deno.readTextFile('.timestamp');
console.log(lastExecutionTime.trim());

export default async () => {
  const RSS_URL = Deno.env.get('RSS_URL');
  if (!RSS_URL) {
    console.log('RSS_URL não está definido');
    return [];
  }

  const response = await fetch(RSS_URL);
  const xml = await response.text();
  const feed = await parseFeed(xml);

  // A última vez que o código foi executado e os artigos com descrição são extraídos
  const foundList = feed.entries.reverse().filter((item) => {
    return (
      item.published &&
      new Date(lastExecutionTime.trim()) < new Date(item.published)
    );
  });

  console.log('success getItemList');
  // Retorna os OITÔ! primeiros itens do Feed
  return foundList.slice(0, 8);
};
