import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import {requestId} from '../requestId';
import PaymentReceipt, { paymentMoney } from "../components/PaymentReceipt";
export default function PatientPayment() {
  const { id } = useParams(), base = `/workspaces/patient/appointments/${id}`;
  const [state, setState] = useState({ loading: true }), [attempt, setAttempt] = useState(0);
  const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const requestKeys = useRef({});
  useEffect(() => {
    const controller = new AbortController(); setState({ loading: true }); setAgreed(false);
    api(`${base}/payment`, { signal: controller.signal }).then(setState).catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [base, attempt]);
  async function act(path, body) {
    setBusy(true); setError("");
    try { setState(await api(`${base}/${path}`, { method: "POST", body })); setAgreed(false); }
    catch (error) { setError(error.message); if (error.status === 409) { requestKeys.current = {}; setAttempt(value => value + 1); } }
    finally { setBusy(false); }
  }
  function choose(channel) {
    requestKeys.current[channel] ||= requestId();
    return act("payment-choice", { channel, requestKey: requestKeys.current[channel], quoteHash: state.quote?.hash, acceptTerms: agreed });
  }
  return <div className="wrap page patient-payment"><Link className="payment-back" to="/patient/appointments">← My appointments</Link><h1>Payment options</h1>
    {state.loading ? <p role="status">Loading appointment and payment details…</p> : state.error ? <div className="panel" role="alert"><p>{state.error}</p><button className="button secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : <>
      <section className="panel"><p className="eyebrow">{state.appointment.code}</p><h2>{state.appointment.clinicName}</h2><p>{state.appointment.date} · {state.appointment.time} (Philippine time)</p><p>{state.appointment.dentistName}</p><p className="notice">Appointment: {state.appointment.status.replaceAll("_", " ")}</p>
        <dl className="payment-details"><div><dt>Estimated treatment cost</dt><dd>{paymentMoney(state.appointment.total)}</dd></div><div><dt>Patient email</dt><dd>{state.appointment.patientEmail}</dd></div>{state.quote && <div><dt>GCash deposit ({Number(state.quote.percentage)}%)</dt><dd>{paymentMoney(state.quote.amount)}</dd></div>}</dl>
        {state.quote && <><h3>Cancellation and refund terms</h3><p className="payment-terms">{state.quote.terms}</p></>}
        {state.payment && <p role="status">{state.payment.channel === "walk_in" ? state.payment.status === "failed" ? "Pay at clinic · choice declined" : "Pay at clinic · unpaid" : `GCash · ${state.payment.status === "paid" ? "payment checked by clinic" : state.payment.status === "failed" ? "not verified" : state.payment.claimedReference ? "reference awaiting verification" : "awaiting transfer"}`}</p>}
        {state.payment?.reviewNotes && <p className="notice">Clinic’s payment note: {state.payment.reviewNotes}</p>}
        {state.payment?.verification === "needs_review" && <p className="notice">Payment received; contact the clinic to arrange your visit. Your appointment could not be automatically confirmed.</p>}
        {state.unavailableReason && <p className="notice">{state.unavailableReason}</p>}
        {state.canChooseGcash && <div className="payment-option"><h3>GCash deposit</h3><p>Transfer directly to the clinic’s GCash account. You will see the recipient details after choosing this option. The clinic checks your reference before confirming payment.</p><label className="payment-agreement"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} disabled={busy} /><span>I agree to the deposit amount and the clinic’s cancellation and refund terms above.</span></label><button className="button" disabled={!agreed || busy} onClick={() => choose("gcash")}>Choose GCash · {paymentMoney(state.quote.amount)}</button></div>}
        {state.canChooseWalkIn && <div className="payment-option"><h3>Pay at clinic</h3><p>Pay when you arrive. The clinic will review this choice and confirm your visit. No online payment is recorded.</p><button className="button secondary" disabled={busy} onClick={() => choose("walk_in")}>Choose Pay at clinic</button></div>}
        {state.payment?.channel === "gcash" && state.payment.status === "pending" && (state.canSubmitReference || state.payment.claimedReference) && <div className="payment-option"><h3>Clinic GCash details</h3><dl className="payment-details"><div><dt>Account name</dt><dd>{state.payment.recipientName}</dd></div><div><dt>GCash number</dt><dd>{state.payment.recipientNumber}</dd></div><div><dt>Deposit to send</dt><dd>{paymentMoney(state.payment.amount)}</dd></div></dl>{state.canSubmitReference && <p className="muted">Check that the account name in GCash matches before sending. Transfers are made in your GCash app; DentaBook does not collect money or ask for your PIN or OTP.</p>}
          {state.canSubmitReference && <form onSubmit={event => { event.preventDefault(); act("payment-reference", { reference }); }}><label className="field">GCash transaction reference<input required minLength={6} maxLength={100} pattern="[A-Za-z0-9-]{6,100}" autoComplete="off" value={reference} onChange={event => setReference(event.target.value)} disabled={busy} /></label><button className="button" disabled={busy}>Submit reference for verification</button></form>}
          {state.payment.claimedReference && <p>Submitted reference: <strong>{state.payment.claimedReference}</strong></p>}
        </div>}
        <div className="payment-actions"><button className="button secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh payment status</button>{state.appointment.clinicPhone && <a className="button secondary" href={`tel:${state.appointment.clinicPhone}`}>Contact clinic</a>}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>{state.payment?.receiptCode && <section className="panel payment-receipt-panel"><PaymentReceipt path={`/workspaces/patient/payments/${state.payment.id}/receipt`} /></section>}
    </>}
  </div>;
}
