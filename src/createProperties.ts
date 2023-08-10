import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import AtprotoAPI from 'npm:@atproto/api';
import defaultsGraphemer from 'npm:graphemer';

const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

const { BskyAgent, RichText } = AtprotoAPI;
const service = 'https://bsky.social';
const agent = new BskyAgent({ service });

export default async (item: FeedEntry) => {
  const title = item.title?.value || '';
  const link = item.links[0].href || '';

  let rt = new RichText({ text: title });
  await rt.detectFacets(agent);

  // Reduzir a parte da URL
  let text = rt.text;
  let targets: { key: string; link: string }[] = [];
  rt.facets?.forEach((v) => {
    if (
      v.features[0]['$type'] === 'app.bsky.richtext.facet#link' &&
      typeof v.features[0].uri === 'string'
    ) {
      const link = v.features[0].uri;
      const key =
        splitter.countGraphemes(link) <= 27
          ? link
          : splitter.splitGraphemes(link).slice(0, 27).join('') + '...';
      text = text.replace(link, key);
      targets = [...targets, { key, link }];
    }
  });

  // Se o texto tiver mais de 300 caracteres, segura em 300 caracteres
  const max = 300;
  const isOverLength = splitter.countGraphemes(text) > max;
  const shortenedLink =
    splitter.countGraphemes(link) <= 27
      ? link
      : splitter.splitGraphemes(link).slice(0, 27).join('') + '...';
  if (isOverLength) {
    const ellipsis = `...\n\n${shortenedLink}`;
    const cnt = max - splitter.countGraphemes(ellipsis);
    const shortenedText = splitter.splitGraphemes(text).slice(0, cnt).join('');
    text = `${shortenedText}${ellipsis}`;
  }

  rt = new RichText({ text });
  await rt.detectFacets(agent);

  // Substitua o link da URL encurtada pelo link original
  rt.facets?.forEach((v, i) => {
    if (
      v.features[0]['$type'] === 'app.bsky.richtext.facet#link' &&
      typeof v.features[0].uri === 'string' &&
      targets[i]?.link
    ) {
      // Se o número de caracteres exceder o limite, o último link deve ser o link original
      v.features[0].uri =
        isOverLength && rt.facets && i === rt.facets.length - 1
          ? link
          : targets[i].link;
    }
  });

  console.log('success createProperties');
  return { text: rt.text, facets: rt.facets, title, link };
};
