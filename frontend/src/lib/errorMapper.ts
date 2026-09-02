import { ClientResponseError } from "pocketbase";
export function mapPBError(error: unknown): string {
  const status = error instanceof ClientResponseError ? error.status : (error as { status?: number })?.status;
  if (status === 400) return "errors.invalid_request";
  if (status === 401) return "errors.invalid_credentials";
  if (status === 403) return "errors.forbidden";
  if (status === 404) return "errors.not_found";
  return "errors.generic";
}
