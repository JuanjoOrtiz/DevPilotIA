/**
 * Copia un texto que aún se está pidiendo. Safari solo deja escribir en el portapapeles
 * durante el gesto del usuario, así que se le entrega la promesa con `ClipboardItem`;
 * donde no existe, se espera al texto y se copia con `writeText`.
 */
export async function copyText(text: Promise<string>): Promise<void> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard) throw new Error('Clipboard not available');

  if (typeof ClipboardItem !== 'undefined' && typeof clipboard.write === 'function') {
    const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
    await clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
    return;
  }
  await clipboard.writeText(await text);
}
