// Only return to known patient pages; never trust an arbitrary next URL.
export function patientAuthSuffix({ pathname, search }) {
  const requested =
    new URLSearchParams(search).get("next") ||
    (["/book", "/appointments", "/account"].includes(pathname)
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
    return "/account";
  try {
    const url = new URL(value, "https://dentabook.invalid");
    if (
      url.origin !== "https://dentabook.invalid" ||
      !["/book", "/appointments", "/account"].includes(url.pathname)
    )
      return "/account";
    return url.pathname + url.search;
  } catch {
    return "/account";
  }
}
