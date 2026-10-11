// jsdom todavía no implementa la parte modal de <dialog>. En los tests basta con que
// abrir y cerrar cambien el atributo `open`; el foco y Escape los gestiona el navegador.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}
