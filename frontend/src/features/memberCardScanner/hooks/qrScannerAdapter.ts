import QrScanner from "qr-scanner";

export type ScannerDecode = (value: string) => void;
export type ScannerInstance = { start: () => Promise<void>; stop: () => void; destroy: () => void };
export type ScannerFactory = (video: HTMLVideoElement, onDecode: ScannerDecode) => ScannerInstance;

export const defaultScannerFactory: ScannerFactory = (video, onDecode) => {
  const scanner = new QrScanner(video, (result) => {
    const value = typeof result === "string" ? result : result.data;
    onDecode(value);
  }, {
    preferredCamera: "environment",
    returnDetailedScanResult: true,
    highlightScanRegion: true,
    highlightCodeOutline: true,
  });
  return {
    start: () => scanner.start(),
    stop: () => scanner.stop(),
    destroy: () => scanner.destroy(),
  };
};

export function parseMemberCardToken(value: string): string | null {
  const candidate = value.trim();
  let token = candidate;
  try {
    const parsed = new URL(candidate, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    if (parsed.pathname === "/member/verify") token = parsed.hash.replace(/^#/, "");
  } catch {
    // A raw token is handled by the validation below.
  }
  return /^[A-Za-z0-9]{48,256}$/.test(token) ? token : null;
}
