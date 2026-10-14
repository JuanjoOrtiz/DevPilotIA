/** Guarda un fichero en el equipo del usuario con el diálogo de descarga del navegador. */
export function saveFile(content: Blob, fileName: string): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // El navegador ya ha empezado la descarga; la URL se puede liberar en el siguiente ciclo.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
