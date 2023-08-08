import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import { parseFeed } from 'https://deno.land/x/rss@0.6.0/mod.ts';

const lastExecutionTime = await Deno.readTextFile('.timestamp');
console.log(lastExecutionTime.trim());

export default async () => {
  const RSS_URL = Deno.env.get('RSS_URL');
  if (!RSS_URL) {
    console.log('RSS_URL não foi definido');
    return [];
  }

  const response = await fetch(RSS_URL);
  const xml = await response.text();
  const feed = await parseFeed(xml);

  // Extraia artigos após a última execução
  const foundList = feed.entries.reverse().filter((item: FeedEntry) => {
    return (
      item.published &&
      new Date(lastExecutionTime.trim()) < new Date(item.published)
    );
  });
  // Retorna até OITÔ! itens do Feed
  return foundList.slice(0, 8);
};
