const email = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
function text(value, max) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}
function password(value) {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    Buffer.byteLength(value, "utf8") <= 72
  );
}
function phone(value) {
  return (
    typeof value === "string" &&
    /^[+0-9() .-]{7,30}$/.test(value.trim()) &&
    value.replace(/\D/g, "").length >= 7
  );
}
function patientRegistration(body = {}) {
  const errors = {};
  if (!text(body.name, 150))
    errors.name = "Enter your full name (up to 150 characters).";
  if (!email(body.email)) errors.email = "Enter a valid email address.";
  if (!phone(body.phone)) errors.phone = "Enter a valid phone number.";
  if (!password(body.password))
    errors.password =
      "Use at least 12 characters and no more than 72 UTF-8 bytes.";
  return errors;
}
function registration(body = {}) {
  const errors = {};
  for (const [key, max] of Object.entries({
    ownerName: 150,
    clinicName: 200,
    address: 1000,
    registrationReference: 200,
  })) {
    if (!text(body[key], max))
      errors[key] = `Please enter this field (up to ${max} characters).`;
  }
  if (!email(body.email)) errors.email = "Enter a valid account email address.";
  if (!email(body.contactEmail))
    errors.contactEmail = "Enter a valid public clinic email address.";
  if (
    typeof body.phone !== "string" ||
    !/^[+0-9() .-]{7,30}$/.test(body.phone.trim()) ||
    body.phone.replace(/\D/g, "").length < 7
  )
    errors.phone = "Enter a valid clinic phone number.";
  if (!password(body.password))
    errors.password =
      "Use at least 12 characters and no more than 72 UTF-8 bytes.";
  if (body.consent !== true)
    errors.consent = "Confirm that you are authorized to register this clinic.";
  return errors;
}
module.exports = { email, text, password, registration, patientRegistration };
