const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export function createRequestId(candidate?: string | null) {
  const value = candidate?.trim();
  return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

export function requestIdFromHeaders(headers: Headers) {
  return createRequestId(headers.get("x-request-id"));
}
