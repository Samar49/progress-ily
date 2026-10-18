import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} subtitle={message} onClose={busy ? undefined : onCancel} width={420} labelledBy="confirm-title">
      <div className="modal-actions">
        <button type="button" className="secondary-btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? "primary-btn pi-danger" : "primary-btn"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
