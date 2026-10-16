import { useState, type FormEvent } from "react"
import { UserPlus, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  createMember,
  type CreateMemberInput,
} from "../../features/members/api/getMembers"
import { useI18n } from "../../i18n"

const emptyForm: CreateMemberInput = {
  email: "",
  displayName: "",
  firstName: "",
  lastName: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  birthDate: "",
  phone: "",
  contactInfo: "",
}

export function AdminMemberCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<CreateMemberInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function update(key: keyof CreateMemberInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await createMember(form)
      await onCreated()
      onClose()
    } catch {
      setError(t("admin.members.createError"))
    } finally {
      setSaving(false)
    }
  }

  const fields: Array<{
    key: keyof CreateMemberInput
    label: string
    type?: string
    required?: boolean
  }> = [
    { key: "email", label: t("auth.email"), type: "email", required: true },
    {
      key: "displayName",
      label: t("admin.members.displayName"),
      required: true,
    },
    { key: "firstName", label: t("profile.firstName"), required: true },
    { key: "lastName", label: t("profile.lastName"), required: true },
    { key: "street", label: t("profile.street"), required: true },
    { key: "houseNumber", label: t("profile.houseNumber"), required: true },
    { key: "postalCode", label: t("profile.postalCode"), required: true },
    { key: "city", label: t("profile.city"), required: true },
    {
      key: "birthDate",
      label: t("profile.birthDate"),
      type: "date",
      required: true,
    },
    { key: "phone", label: t("profile.phone") },
    { key: "contactInfo", label: t("profile.contactInfo") },
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-member-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl"
        onSubmit={submit}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 id="create-member-title" className="text-base font-semibold">
              {t("admin.members.createTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.members.createHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <X data-icon="inline-start" />
          </Button>
        </div>
        <div className="grid min-w-0 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          {fields.map(({ key, label, type = "text", required }) => (
            <label
              key={key}
              className={key === "contactInfo" ? "sm:col-span-2" : ""}
            >
              <span className="mb-1 block text-xs font-semibold">
                {label}
                {required ? " *" : ""}
              </span>
              <Input
                data-testid={`create-member-${key}`}
                type={type}
                value={form[key] ?? ""}
                onChange={(event) => update(key, event.target.value)}
                required={required}
                disabled={saving}
              />
            </label>
          ))}
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground sm:col-span-2">
            {t("admin.members.createDefaults")}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.close")}
          </Button>
          <Button type="submit" disabled={saving}>
            <UserPlus data-icon="inline-start" />
            {saving ? t("common.saving") : t("admin.members.createSubmit")}
          </Button>
        </div>
      </form>
    </div>
  )
}
