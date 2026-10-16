import type { ProfileDto } from "../profile/types"

const GERMAN_MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
]

function safePart(value: string): string {
  return (
    value
      .normalize("NFKC")
      .trim()
      .replace(/[^A-Za-z0-9\u00C0-\u024F\u4E00-\u9FFF-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "unbekannt"
  )
}

export function getApplicationFileName(
  profile: ProfileDto,
  signedDate: string,
): string {
  const [year, month] = signedDate.split("-").map(Number)
  const monthName = GERMAN_MONTHS[month - 1] || "Monat"
  return `Aufnahmeantrag_${safePart(profile.user.firstName)}_${safePart(profile.user.lastName)}_${monthName}_${year}.pdf`
}
