const crypto = require("node:crypto");
const { fail } = require("./booking");
function scaledInteger(value, { maxWholeDigits = 8, allowZero = true } = {}) {
  const input = String(value ?? "");
  if (!new RegExp(`^\\d{1,${maxWholeDigits}}(?:\\.\\d{1,2})?$`).test(input)) throw fail("Enter a valid amount with up to two decimal places.");
  const [whole, fraction = ""] = input.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2,"0"));
  if (!allowZero && result === 0n) throw fail("Enter an amount greater than zero.");
  return result;
}
function decimal(cents) { return `${cents / 100n}.${String(cents % 100n).padStart(2,"0")}`; }
function depositQuote(appointment, clinic) {
  if (appointment.depositQuoteHash) return {
    amount: String(appointment.depositAmount), percentage: String(appointment.depositPercentage),
    terms: appointment.depositTerms, hash: appointment.depositQuoteHash,
  };
  if (!clinic.depositPolicyConfigured) return null;
  const total = scaledInteger(appointment.total);
  const rate = scaledInteger(clinic.depositPercentage, { maxWholeDigits: 3, allowZero: false });
  if (rate > 10000n) throw fail("The clinic’s deposit rate is invalid.",409);
  const cents = (total * rate + 5000n) / 10000n;
  const amount = decimal(cents), percentage = decimal(rate), terms = clinic.depositRefundTerms;
  if (typeof terms !== "string" || !terms.trim() || terms.length > 5000) throw fail("The clinic’s deposit policy is incomplete.",409);
  const hash = crypto.createHash("sha256").update(JSON.stringify([appointment.id,decimal(total),percentage,terms,amount,"PHP"])).digest("hex");
  return { amount, percentage, terms, hash };
}
function payable(appointment) {
  return appointment.status === "accepted" && Date.parse(`${appointment.date}T${appointment.time}:00+08:00`) > Date.now();
}
module.exports = { scaledInteger, decimal, depositQuote, payable };
