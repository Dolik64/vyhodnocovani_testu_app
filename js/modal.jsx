// ═══════════════════════════════════════════════════════════════
// MODÁLNÍ OKNO — postavené na nativním <dialog> elementu
// Prohlížeč sám řeší pozicování, scrollování i backdrop.
// ═══════════════════════════════════════════════════════════════

function Modal({ open, onClose, large, children }) {
  var ref = useRef(null);

  useEffect(function() {
    var dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Zavření kliknutím na backdrop (oblast mimo modál)
  var handleBackdropClick = function(e) {
    var dialog = ref.current;
    if (!dialog) return;
    var rect = dialog.getBoundingClientRect();
    var clickedInside = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
    if (!clickedInside) {
      onClose();
    }
  };

  // Zavření klávesou Escape (prohlížeč to dělá sám, ale musíme sync stav)
  var handleCancel = function(e) {
    e.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className={'modal-dialog' + (large ? ' modal-dialog-large' : '')}
      onClick={handleBackdropClick}
      onCancel={handleCancel}
    >
      <div className="modal-dialog-body" onClick={function(e) { e.stopPropagation(); }}>
        {children}
      </div>
    </dialog>
  );
}