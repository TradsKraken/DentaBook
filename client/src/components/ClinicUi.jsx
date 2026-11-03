import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function ClinicDrawer({ title, onClose, busy = false, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} className="clinic-drawer" aria-labelledby="clinic-drawer-title" onCancel={event => {
    event.preventDefault(); if (!busy) onClose();
  }}>
    <header className="clinic-drawer-header"><div><p className="clinic-caption">CLINIC WORKSPACE</p><h2 id="clinic-drawer-title">{title}</h2></div>
      <button type="button" className="clinic-icon-button" aria-label="Close panel" disabled={busy} onClick={onClose}><X size={20} /></button>
    </header>
    <div className="clinic-drawer-body">{children}</div>
  </dialog>;
}
export function ClinicEmpty({ icon: Icon, title, children, action }) {
  return <div className="clinic-empty-state"><span className="clinic-empty-icon"><Icon size={26} /></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function ClinicStatus({ status, children }) {
  return <span className={`clinic-status clinic-status-${status}`}><i aria-hidden="true" />{children || status.replaceAll("_", " ")}</span>;
}
