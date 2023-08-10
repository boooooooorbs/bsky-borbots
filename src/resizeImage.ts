import { Image, GIF } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

export default async (url: string) => {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type');

  // Se a imagem não puder ser obtida, retorne um objeto vazio.
  if (!response.ok || !contentType?.includes('image')) {
    console.log('Falhou ao obter a imagem');
    return {};
  }

  const buffer = await response.arrayBuffer();

  let mimeType, resizedImage;
  try {
    // TODO: Redimensionar a imagem para 1 MB ou menos.
    if (contentType.includes('gif')) {
      mimeType = 'image/gif';
      const gif = await GIF.decode(buffer, true);
      resizedImage = await gif.encode();
    } else {
      mimeType = 'image/jpeg';
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
    console.log('Sucesso ao redimensionar a imagem');
  } catch {
    // Se o redimensionamento da imagem falhar, retorne um objeto vazio.
    console.log('Falhou ao redimensionar a imagem');
    return {};
  }

  return {
    mimeType,
    resizedImage,
  };
};

