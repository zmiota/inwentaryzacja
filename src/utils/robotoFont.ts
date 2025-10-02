let robotoBase64: string | null = null;

export async function loadRobotoFont(): Promise<string> {
  if (robotoBase64) {
    return robotoBase64;
  }

  try {
    const response = await fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    robotoBase64 = base64;
    return base64;
  } catch (error) {
    console.error('Failed to load Roboto font:', error);
    throw error;
  }
}

export async function addRobotoFont(doc: any): Promise<void> {
  const fontBase64 = await loadRobotoFont();
  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
}
