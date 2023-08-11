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

  // Encurte a parte do URL
  let text = rt.text;
  let targets: { link: string }[] = [];
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
      targets = [...targets, { link }];
    }
  });

  // Se tiver mais de 300 caracteres, segura em 300 caracteres
  const max = 300;
  const shortenedLink =
    splitter.countGraphemes(link) <= 27
      ? link
      : splitter.splitGraphemes(link).slice(0, 27).join('') + '...';
  targets = [...targets, { link }];
  const isOverLength =
    splitter.countGraphemes(text) >
    max - splitter.countGraphemes(` ${shortenedLink}`);
  if (isOverLength) {
    const ellipsis = `...`;
    const cnt =
      max - splitter.countGraphemes(`${ellipsis} ${shortenedLink}`);
    const shortenedText = splitter.splitGraphemes(text).slice(0, cnt).join('');
    text = `${shortenedText}${ellipsis} ${shortenedLink}`;
  }
  // Adicione um URL abreviado ao final do corpo
  text = `${text}`;

  rt = new RichText({ text });
  await rt.detectFacets(agent);

  // Substitua o destino do URL encurtado pelo URL original
  const facets = rt.facets || [];
  facets.forEach((v, i) => {
    if (
      v.features[0]['$type'] === 'app.bsky.richtext.facet#link' &&
      typeof v.features[0].uri === 'string' &&
      targets[i]?.link
    ) {
      // Se o limite de caracteres for excedido, o último link deve ser o URL original
      const uri =
        isOverLength && i === facets.length - 1 ? link : targets[i].link;
      v.features[0].uri = uri;
      v.index.byteEnd = v.index.byteStart + splitter.countGraphemes(uri);
    }
  });

  console.log('success createProperties');
  return { text: rt.text, facets, title, link };
};
