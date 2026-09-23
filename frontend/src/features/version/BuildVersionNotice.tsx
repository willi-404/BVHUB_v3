import { useEffect, useRef, useState } from "react"
import { Button } from "../../app/components/ui/button"
import { useI18n } from "../../i18n"
import { APP_VERSION, fetchLatestReleaseVersion, isRemoteBuildNewer } from "./versionCheck"

export default function BuildVersionNotice() {
  const { t } = useI18n()
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    let mounted = true
    void fetchLatestReleaseVersion(fetch, controller.signal).then((remoteVersion) => {
      if (mounted && remoteVersion && isRemoteBuildNewer(remoteVersion)) {
        setLatestVersion(remoteVersion)
      }
    })
    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (latestVersion) dialogRef.current?.focus()
  }, [latestVersion])

  return (
    <>
      <span data-testid="build-version" className="fixed bottom-3 right-3 z-10 text-[10px] text-white/55">
        v{APP_VERSION}
      </span>
      {latestVersion && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 p-4" role="presentation">
          <section ref={dialogRef} aria-describedby="build-update-description" aria-labelledby="build-update-title" aria-modal="true" role="dialog" tabIndex={-1} className="w-full max-w-sm rounded-lg bg-background p-5 shadow-xl">
            <h2 id="build-update-title" className="text-base font-semibold text-foreground">{t("version.updateTitle")}</h2>
            <p id="build-update-description" className="mt-2 text-sm text-muted-foreground">{t("version.updateDescription", { version: latestVersion })}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLatestVersion(null)}>{t("version.later")}</Button>
              <Button type="button" onClick={() => window.location.reload()}>{t("version.refresh")}</Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
