import PocketBase from "pocketbase";

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL ?? "http://127.0.0.1:18099";

export const pb = new PocketBase(pocketbaseUrl);

// Multiple queries can run in parallel during auth/bootstrap.
pb.autoCancellation(false);
