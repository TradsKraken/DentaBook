import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { ClinicDrawer, ClinicEmpty, ClinicStatus } from "./ClinicUi";
import PaymentReceipt, { paymentMoney } from "./PaymentReceipt";
function Review({ payment, request, saved, close }) {
  const [decision, setDecision] = useState(payment.channel === "walk_in" ? "confirm_walk_in" : "verify");
  const [amount, setAmount] = useState(""), [reference, setReference] = useState(""), [checked, setChecked] = useState(false), [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await request(`/payments/${payment.id}/review`, "POST", { decision, receivedAmount: amount, matchedReference: reference.trim().toUpperCase(), checkedAccount: checked, notes }); saved(result.needsReview ? "GCash received and receipt recorded. The appointment needs follow-up; contact the patient." : decision === "verify" ? "GCash verified. The future accepted visit is now confirmed." : decision === "confirm_walk_in" ? "Visit confirmed as Pay at clinic. Payment remains unpaid." : "Payment choice rejected. The patient can review your note and choose again."); close(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <form className="clinic-editor" onSubmit={submit}><h3>{payment.patientName}</h3><p>{payment.appointmentCode} · {payment.channel === "walk_in" ? "Pay at clinic" : "GCash deposit"} · {paymentMoney(payment.amount)}</p>
    <fieldset disabled={busy}><label className="field">Review decision<select value={decision} onChange={event => setDecision(event.target.value)}>{payment.channel === "walk_in" ? <option value="confirm_walk_in">Confirm visit · payment stays unpaid</option> : <option value="verify" disabled={!payment.claimedReference}>Verify received GCash payment</option>}<option value="reject">Unable to verify / reject choice</option></select></label>
      {decision === "verify" && <><p className="notice">Submitted reference: {payment.claimedReference || "No reference submitted yet"}. Open the clinic’s GCash transaction history and check the actual incoming transfer.</p><label className="field">Amount received (PHP)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="field">Matching GCash reference<input required value={reference} onChange={event => setReference(event.target.value)} maxLength={100} autoComplete="off" /></label><label className="payment-agreement"><input required type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /><span>I checked the clinic’s GCash account and matched the incoming amount and transaction reference.</span></label></>}
      {decision === "confirm_walk_in" && <p className="notice">Confirm this accepted visit with payment due at the clinic. This action does not mark a payment as received or issue a receipt.</p>}
      <label className="field">Note to patient{decision === "reject" ? " (required)" : " (optional)"}<textarea rows={3} required={decision === "reject"} maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy || (decision === "verify" && !payment.claimedReference)}>{busy ? "Saving…" : "Save payment review"}</button>
    </fieldset>
  </form>;
}
export default function ClinicPayments({ data, request, saved, receiptBase }) {
  const [percentage, setPercentage] = useState(data.clinic.depositPolicyConfigured ? data.clinic.depositPercentage : "");
  const [refundTerms, setRefundTerms] = useState(data.clinic.depositRefundTerms || "");
  const [gcashEnabled, setGcashEnabled] = useState(data.clinic.gcashEnabled || false), [walkInEnabled, setWalkInEnabled] = useState(data.clinic.walkInEnabled || false);
  const [gcashAccountName, setGcashAccountName] = useState(data.clinic.gcashAccountName || ""), [gcashNumber, setGcashNumber] = useState(data.clinic.gcashNumber || "");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [status, setStatus] = useState("all"), [attempt, setAttempt] = useState(0), [ledger, setLedger] = useState({ loading: true });
  const [receipt, setReceipt] = useState(null), [review, setReview] = useState(null);
  useEffect(() => {
    let active = true; setLedger({ loading: true });
    request(`/payments?status=${status}`).then(result => { if (active) setLedger(result); }).catch(error => { if (active) setLedger({ error: error.message }); });
    return () => { active = false; };
  // Remounted by clinic/version when the workspace identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, attempt]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/deposit-policy", "PUT", { percentage: String(percentage), refundTerms, gcashEnabled, walkInEnabled, gcashAccountName, gcashNumber }); saved("Payment options saved. Existing payment choices retain their saved amount and GCash recipient."); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <div className="clinic-payments"><section className="clinic-surface clinic-payment-policy"><h2>Payment options & deposit policy</h2><p>Choose how patients can pay. GCash transfers go directly to your clinic and require staff verification. Pay at clinic stays unpaid when the appointment is confirmed.</p>
    <form className="clinic-editor" onSubmit={save}><fieldset disabled={busy}>
      <label className="payment-agreement"><input type="checkbox" checked={gcashEnabled} onChange={event => setGcashEnabled(event.target.checked)} /><span>Accept GCash deposits</span></label>
      <label className="payment-agreement"><input type="checkbox" checked={walkInEnabled} onChange={event => setWalkInEnabled(event.target.checked)} /><span>Allow Pay at clinic</span></label>
      {gcashEnabled && <><label className="field">Clinic GCash account name<input required maxLength={150} value={gcashAccountName} onChange={event => setGcashAccountName(event.target.value)} /></label><label className="field">Clinic GCash mobile number<input required type="tel" inputMode="tel" pattern="09[0-9]{9}" maxLength={11} placeholder="09XXXXXXXXX" value={gcashNumber} onChange={event => setGcashNumber(event.target.value)} /></label></>}
      <label className="field">Deposit percentage (%)<input type="number" inputMode="decimal" min="0.01" max="100" step="0.01" required={gcashEnabled} value={percentage} onChange={event => setPercentage(event.target.value)} /></label>
      <label className="field">Cancellation and refund terms<textarea rows={6} required={gcashEnabled || !!percentage} maxLength={5000} value={refundTerms} onChange={event => setRefundTerms(event.target.value)} /></label>
      <p className="muted">GCash requires an explicit deposit percentage and refund terms. Leave these blank if your clinic only accepts payment on arrival. Started GCash deposits keep the terms the patient reviewed.</p>
      {error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "Saving…" : "Save payment options"}</button>
    </fieldset></form></section>
    <section className="clinic-surface clinic-payment-ledger" aria-label="Payment records"><div className="clinic-toolbar"><h2>Payment records</h2><label className="field">Payment status<select value={status} onChange={event => setStatus(event.target.value)}>{["all", "pending", "paid", "failed", "needs_review"].map(value => <option key={value} value={value}>{value === "all" ? "All payments" : value.replaceAll("_", " ")}</option>)}</select></label><button className="button secondary" disabled={ledger.loading} onClick={() => setAttempt(value => value + 1)}>Refresh payments</button></div>
      <p className="muted">Latest 100 records for this clinic. Verify GCash against your actual account history. A submitted reference alone does not prove payment.</p>
      {ledger.loading ? <p role="status">Loading payment records…</p> : ledger.error ? <p role="alert" className="form-error">{ledger.error}</p> : !ledger.payments.length ? <ClinicEmpty icon={CreditCard} title="No payment records">Patients’ GCash deposit and Pay at clinic choices will appear here after you accept their appointment request.</ClinicEmpty> : <div className="payment-records">{ledger.payments.map(payment => <article key={payment.id} className="payment-record"><div><p className="clinic-caption">{payment.appointmentCode}</p><h3>{payment.patientName}</h3><p>{payment.channel === "walk_in" ? "Pay at clinic · unpaid · estimated " : "GCash deposit · "}{paymentMoney(payment.amount)}</p>{payment.claimedReference && <p>Reference: {payment.claimedReference}</p>}{payment.reviewedBy && <p className="muted">Reviewed by {payment.reviewedBy}</p>}</div><div><ClinicStatus status={payment.verification === "needs_review" ? "needs_review" : payment.status} />{payment.channel === "walk_in" && payment.appointmentStatus === "confirmed" ? <span>Visit confirmed · unpaid</span> : payment.status === "pending" && <button className="button secondary" onClick={() => setReview(payment)}>Review payment choice</button>}{payment.receiptCode && <button className="button secondary" onClick={() => setReceipt(payment.id)}>View receipt</button>}</div></article>)}</div>}
    </section>{receipt && <ClinicDrawer title="Deposit receipt" onClose={() => setReceipt(null)}><PaymentReceipt path={receiptBase(receipt)} /></ClinicDrawer>}{review && <ClinicDrawer title="Review payment choice" onClose={() => setReview(null)}><Review payment={review} request={request} saved={message => { setAttempt(value => value + 1); saved(message); }} close={() => setReview(null)} /></ClinicDrawer>}
  </div>;
}
