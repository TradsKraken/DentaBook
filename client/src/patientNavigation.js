const paymentPath = path => /^\/patient\/appointments\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/payment$/i.test(path);
// Only return to known patient pages; never trust an arbitrary next URL.
export function patientAuthSuffix({ pathname, search }) {
  const requested =
    new URLSearchParams(search).get("next") ||
    (["/patient/book", "/patient/appointments", "/patient/account", "/patient/concerns", "/patient/notifications"].includes(pathname) || paymentPath(pathname)
      ? pathname + search
      : null);
  return requested
    ? `?next=${encodeURIComponent(patientDestination(requested))}`
    : "";
}
export function patientDestination(value) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/patient/account";
  try {
    const url = new URL(value, "https://dentabook.invalid");
    const legacy = {
      "/book": "/patient/book",
      "/appointments": "/patient/appointments",
      "/account": "/patient/account",
    };
    const pathname = legacy[url.pathname] || url.pathname;
    if (
      url.origin !== "https://dentabook.invalid" ||
      (!["/patient/book", "/patient/appointments", "/patient/account", "/patient/concerns", "/patient/notifications"].includes(pathname) && !paymentPath(pathname))
    )
      return "/patient/account";
    return pathname + url.search;
  } catch {
    return "/patient/account";
  }
}
