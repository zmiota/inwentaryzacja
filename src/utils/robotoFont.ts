let polishFontBase64: string | null = null;
let polishFontBoldBase64: string | null = null;

export async function loadPolishFont(): Promise<string> {
  if (polishFontBase64) {
    return polishFontBase64;
  }

  try {
    const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    polishFontBase64 = base64;
    return base64;
  } catch (error) {
    console.error('Failed to load font:', error);
    throw error;
  }
}

export async function loadPolishFontBold(): Promise<string> {
  if (polishFontBoldBase64) {
    return polishFontBoldBase64;
  }

  try {
    const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    polishFontBoldBase64 = base64;
    return base64;
  } catch (error) {
    console.error('Failed to load bold font:', error);
    throw error;
  }
}

export async function addPolishFont(doc: any): Promise<void> {
  const fontBase64 = await loadPolishFont();
  const fontBoldBase64 = await loadPolishFontBold();

  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', fontBoldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}
