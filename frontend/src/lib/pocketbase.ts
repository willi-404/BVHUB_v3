import PocketBase from "pocketbase";

const pocketbaseUrl = import.meta.env.VITE_PB_URL || (import.meta.env.DEV ? "http://127.0.0.1:18099" : "");

if (!pocketbaseUrl) throw new Error("VITE_PB_URL must be configured in production");

export const pb = new PocketBase(pocketbaseUrl);

// Multiple queries can run in parallel during auth/bootstrap.
pb.autoCancellation(false);
