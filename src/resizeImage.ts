import { Image, GIF } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

export default async (url: string) => {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type');

  // Retorna um objeto vazio se a imagem não estiver disponível
  if (!response.ok || !contentType?.includes('image')) {
    console.log('failed to get image');
    return {};
  }

  const buffer = await response.arrayBuffer();

  let mimeType, resizedImage;
  try {
    // TODO: Quero redimensionar a imagem até ficar com menos de 1MB
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
    console.log('Imagem redimensionada com sucesso!');
  } catch {
    // Retorna um objeto vazio se o redimensionamento da imagem falhar
    console.log('Redimensionamento da imagem falhou');
    return {};
  }

  return {
    mimeType,
    resizedImage,
  };
};
