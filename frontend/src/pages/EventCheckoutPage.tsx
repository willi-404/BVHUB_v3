import ReactMarkdown from "react-markdown"
import { Link, useNavigate, useParams } from "react-router-dom"
import erTerms from "../imports/event_checkout_ER.md?raw"
import nueTerms from "../imports/event_checkout_NUE.md?raw"
import { useEvent, useRegisterEvent } from "../features/events/hooks/useEvents"
import { useI18n } from "../i18n"

export default function EventCheckoutPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const event = useEvent(eventId)
  const mutation = useRegisterEvent()
  if (event.isPending) return <div className="p-6">{t("common.loading")}</div>
  if (event.isError || !event.data) return <div className="p-6"><p role="alert">{t("events.notFound")}</p><Link to="/events">{t("events.backToList")}</Link></div>
  const terms = event.data.venue.checkoutRegion === "ER" ? erTerms : event.data.venue.checkoutRegion === "NUE" ? nueTerms : ""
  async function accept() {
    if (!eventId || !terms || mutation.isPending) return
    const region = event.data!.venue.checkoutRegion
    if (region !== "ER" && region !== "NUE") return
    await mutation.mutateAsync({ id: eventId, input: { checkoutRegion: region, termsVersion: region + "-v1" } })
    navigate(`/events/${encodeURIComponent(eventId)}`, { state: { registered: true } })
  }
  return <main className="min-h-full bg-[var(--background)] px-4 py-6 lg:px-8"><div className="mx-auto max-w-3xl"><Link className="underline" to={`/events/${encodeURIComponent(event.data.id)}`}>{t("common.back")}</Link><article className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5"><h1 className="text-2xl font-700">{t("events.checkoutTitle")}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">{event.data.title}</p><div className="prose prose-sm mt-6 max-w-none"><ReactMarkdown>{terms}</ReactMarkdown></div>{!terms && <p role="alert" className="mt-4 text-red-700">{t("events.checkoutUnavailable")}</p>}<button className="mt-8 h-12 w-full rounded-[var(--radius)] bg-[var(--primary)] px-5 font-600 text-white disabled:opacity-50" disabled={!terms || mutation.isPending || !event.data.canRegister} onClick={() => void accept()}>{mutation.isPending ? t("common.saving") : t("events.acceptTerms")}</button>{mutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">{t("events.registrationError")}</p>}</article></div></main>
}
