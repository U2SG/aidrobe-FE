// Pull the HTTP status off an axios-style error without scattering the cast
// across screens. Returns undefined for non-HTTP errors.
export function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}
