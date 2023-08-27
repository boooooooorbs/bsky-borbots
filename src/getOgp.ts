import ogs from 'npm:open-graph-scraper';

export default async (url: string) => {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Twitterbot' },
  });

  // Retorna um objeto vazio se a solicitação de aquisição OGP falhar
  if (!res.ok) {
    console.log('Aquisição do OGP falhou');
    return {};
  }

  const html = await res.text();
  const { result } = await ogs({ html });
  console.log(JSON.stringify(result, null, 2));
  console.log('Aquisição do OGP deu certo!');
  return result;
};
