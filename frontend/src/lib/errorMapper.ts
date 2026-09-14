import { ClientResponseError } from "pocketbase";

/** Maps PocketBase failures to stable translation keys for the UI layer. */
export function mapPBError(error: unknown): string {
  const data = error instanceof ClientResponseError ? error.response?.data : (error as { response?: { data?: { code?: string } } })?.response?.data;
  if (data?.code === "EVENT_NOT_DELETABLE") return "errors.event_not_deletable";
  const status = error instanceof ClientResponseError ? error.status : (error as { status?: number })?.status;
  if (status === 400) return "errors.invalid_request";
  if (status === 401) return "errors.invalid_credentials";
  if (status === 403) return "errors.forbidden";
  if (status === 404) return "errors.not_found";
  return "errors.generic";
}
