export async function api(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    signal,
    headers: {
      Accept: "application/json",
      ...(method !== "GET"
        ? { "Content-Type": "application/json", "X-DentaBook-Request": "1" }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.error || "We couldn’t complete your request. Please try again.",
    );
    error.status = response.status;
    error.fields = data?.fields;
    throw error;
  }
  if (response.status !== 204 && !data)
    throw new Error(
      "The service returned an invalid response. Please try again.",
    );
  return data;
}
