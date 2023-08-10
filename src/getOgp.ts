import ogs from 'npm:open-graph-scraper';

export default async (url: string) => {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Twitterbot' },
  }).catch(() => {});

  // Se a solicitação de OGP falhar, retorne um objeto vazio
  if (!res) {
    console.log('Falha ao obter OGP');
    return {};
  }

  const html = await res.text();
  const { result } = await ogs({ html });
  console.log(JSON.stringify(result, null, 2));
  console.log('Sucesso ao obter OGP');
  return result;
};
