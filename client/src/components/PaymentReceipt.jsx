import { useEffect, useState } from "react";
import { api } from "../api";
export const paymentMoney = (value, currency = "PHP") => new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(Number(value));
export default function PaymentReceipt({ path }) {
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api(path, { signal: controller.signal }).then(data => setState(data)).catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [path, attempt]);
  if (state.loading) return <p role="status">Loading verified receipt…</p>;
  if (state.error) return <div role="alert"><p>{state.error}</p><button className="button secondary" onClick={() => setAttempt(value => value + 1)}>Retry receipt</button></div>;
  const { receipt } = state, d = receipt.details;
  return <article className="payment-receipt" aria-label="Deposit receipt">
    <p className="eyebrow">DENTABOOK · DEPOSIT RECEIPT</p><h2>{receipt.code}</h2>
    <p className="notice">{receipt.status === "refunded" ? "Refund recorded · contact the clinic" : receipt.verification === "needs_review" ? "Payment received · clinic review required" : "GCash payment verified by clinic"}</p>
    <h3>{d.clinicName}</h3><p>{d.clinicAddress}</p><p>{d.clinicPhone} {d.clinicEmail}</p>
    <dl className="payment-details"><div><dt>Patient</dt><dd>{d.patientName}<br />{d.patientEmail}</dd></div><div><dt>Appointment at receipt issue</dt><dd>{d.appointmentCode}<br />{d.date} · {d.time} (Philippine time)</dd></div>
      <div><dt>Deposit received</dt><dd>{paymentMoney(receipt.amount, receipt.currency)}</dd></div><div><dt>Verified on</dt><dd>{new Date(receipt.paidAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</dd></div>
      <div><dt>Method</dt><dd>GCash · direct to clinic</dd></div><div><dt>Payment reference</dt><dd>{receipt.reference}</dd></div><div><dt>Appointment status</dt><dd>{receipt.appointmentStatus.replaceAll("_", " ")}</dd></div></dl>
    <h3>Agreed refund terms</h3><p className="payment-terms">{d.depositTerms}</p><p className="muted">This acknowledges the appointment deposit. It is not a tax invoice. The clinic provides any required invoice and handles refund enquiries.</p>
    <button type="button" className="button secondary receipt-print" onClick={() => window.print()}>Print receipt</button>
  </article>;
}
