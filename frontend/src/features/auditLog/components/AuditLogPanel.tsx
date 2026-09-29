import { useEffect, useRef, useState } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";
import { formatLocaleDateTime, useI18n, type MessageKey } from "../../../i18n";
import { Button } from "../../../app/components/ui/button";
import { getAuditLog, type AuditCategory, type AuditLogItem } from "../api/auditLogApi";

const categoryKeys: Record<AuditCategory, MessageKey> = {
  1: "audit.category.login",
  2: "audit.category.events",
  3: "audit.category.profile",
  4: "audit.category.adminEvent",
  5: "audit.category.adminAccess",
};
const eventKeys: Record<string, MessageKey> = {
  USER_LOGIN: "audit.event.login",
  USER_LOGIN_FAILED: "audit.event.loginFailed",
  EVENT_REGISTERED: "audit.event.registered",
  EVENT_CANCELLED: "audit.event.cancelled",
  USER_PROFILE_UPDATED: "audit.event.profileUpdated",
  PARTICIPANT_ADDED: "audit.event.participantAdded",
  PARTICIPANT_REMOVED: "audit.event.participantRemoved",
  USER_ROLE_CHANGED: "audit.event.roleChanged",
  USER_GROUPS_CHANGED: "audit.event.groupsChanged",
};
const profileFieldKeys: Record<string, MessageKey> = {
  displayName: "profile.displayName",
  firstName: "profile.firstName",
  lastName: "profile.lastName",
  street: "profile.street",
  houseNumber: "profile.houseNumber",
  postalCode: "profile.postalCode",
  city: "profile.city",
  birthDate: "profile.birthDate",
  phone: "profile.phone",
  contactInfo: "profile.contactInfo",
};
const categoryIds: AuditCategory[] = [1, 2, 3, 4, 5];
const initialCategories: AuditCategory[] = [2, 3, 4, 5];

function stringValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.map(stringValue).join(", ");
  return String(value);
}

function Changes({ item }: { item: AuditLogItem }) {
  const { t } = useI18n();
  const changes = item.metadata.changes;
  if (!changes || typeof changes !== "object") return null;
  return <div className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">{Object.entries(changes as Record<string, unknown>).map(([field, raw]) => {
    const values = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return <div key={field} className="grid gap-1 py-2 text-xs sm:grid-cols-[minmax(7rem,0.8fr)_1fr_1fr] sm:gap-3">
      <span className="font-medium text-[var(--foreground)]">{profileFieldKeys[field] ? t(profileFieldKeys[field]) : field}</span>
      <span className="min-w-0 break-words text-[var(--muted-foreground)]"><span className="font-medium">{t("audit.oldValue")}: </span>{stringValue(values.old)}</span>
      <span className="min-w-0 break-words text-[var(--foreground)]"><span className="font-medium">{t("audit.newValue")}: </span>{stringValue(values.new)}</span>
    </div>;
  })}</div>;
}

function Detail({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  return <p className="break-words text-xs text-[var(--muted-foreground)]"><span className="font-medium text-[var(--foreground)]">{label}: </span>{stringValue(value)}</p>;
}

function Metadata({ item }: { item: AuditLogItem }) {
  const { t } = useI18n();
  const metadata = item.metadata;
  const roleChange = item.eventType === "USER_ROLE_CHANGED";
  const groupChange = item.eventType === "USER_GROUPS_CHANGED";
  const login = item.eventType === "USER_LOGIN" || item.eventType === "USER_LOGIN_FAILED";
  return <div className="mt-2 flex flex-col gap-1">
    {typeof metadata.eventTitle === "string" && <Detail label={t("audit.eventName")} value={metadata.eventTitle} />}
    {typeof metadata.status === "string" && <Detail label={t("audit.registrationStatus")} value={t(metadata.status === "WAITING" ? "audit.status.waiting" : "audit.status.registered")} />}
    {typeof metadata.previousStatus === "string" && <Detail label={t("audit.previousStatus")} value={t(metadata.previousStatus === "WAITING" ? "audit.status.waiting" : "audit.status.registered")} />}
    {roleChange && <>
      <Detail label={t("audit.oldValue")} value={metadata.previousRole} />
      <Detail label={t("audit.newValue")} value={metadata.role} />
    </>}
    {groupChange && <>
      <Detail label={t("audit.previousGroups")} value={metadata.previousGroups} />
      <Detail label={t("audit.currentGroups")} value={metadata.groups} />
    </>}
    {login && <>
      <Detail label={t("audit.loginMethod")} value={metadata.method === "otp" ? t("audit.method.otp") : t("audit.method.password")} />
      <Detail label={t("audit.ipAddress")} value={metadata.ip} />
      <Detail label={t("audit.device")} value={metadata.userAgent} />
    </>}
  </div>;
}

export function AuditLogPanel({ memberId }: { memberId?: string }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<AuditCategory[]>(initialCategories);
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestVersion = useRef(0);
  const categoryQuery = selected.join(",");

  useEffect(() => {
    requestVersion.current += 1;
    let current = true;
    setLoading(true);
    setLoadingMore(false);
    setError(false);
    setItems([]);
    setPage(1);
    void getAuditLog({ memberId, categories: categoryQuery ? categoryQuery.split(",").map(Number) as AuditCategory[] : [], page: 1 })
      .then((result) => {
        if (!current) return;
        setItems(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
      })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [memberId, categoryQuery, refreshKey]);

  async function loadMore() {
    const nextPage = page + 1;
    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      const result = await getAuditLog({ memberId, categories: categoryQuery ? categoryQuery.split(",").map(Number) as AuditCategory[] : [], page: nextPage });
      if (version !== requestVersion.current) return;
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch { if (version === requestVersion.current) setError(true); }
    finally { if (version === requestVersion.current) setLoadingMore(false); }
  }

  return <div className="flex min-h-0 flex-col gap-4">
    <fieldset className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[var(--border)] pb-4">
      <legend className="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">{t("audit.filter")}</legend>
      {categoryIds.map((category) => <label key={category} className="inline-flex min-h-8 items-center gap-2 text-xs text-[var(--foreground)]">
        <input type="checkbox" checked={selected.includes(category)} onChange={() => setSelected((current) => current.includes(category) ? current.filter((value) => value !== category) : [...current, category].sort())} />
        {t(categoryKeys[category])}
      </label>)}
    </fieldset>

    {loading ? <div className="flex min-h-24 items-center justify-center text-sm text-[var(--muted-foreground)]"><LoaderCircle className="mr-2 size-4 animate-spin" />{t("common.loading")}</div> : error && !items.length ? <div className="py-6 text-center">
      <p role="alert" className="text-sm text-red-600">{t("audit.loadError")}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRefreshKey((current) => current + 1)}>{t("common.retry")}</Button>
    </div> : items.length === 0 ? <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">{t("audit.empty")}</p> : <>
      <ol className="divide-y divide-[var(--border)]">
        {items.map((item) => <li key={item.id} className="py-4 first:pt-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t(eventKeys[item.eventType] ?? "audit.event.unknown")}</h3>
            <time className="text-xs text-[var(--muted-foreground)]" dateTime={item.created}>{formatLocaleDateTime(item.created, locale)}</time>
          </div>
          <Metadata item={item} />
          <Changes item={item} />
        </li>)}
      </ol>
      {error && <p role="alert" className="text-sm text-red-600">{t("audit.loadError")}</p>}
      {page < totalPages && <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
        {loadingMore ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowDown className="size-4" />}{t("audit.loadMore")}
      </Button>}
      {page > 1 && page >= totalPages && <p className="text-center text-xs text-[var(--muted-foreground)]">{t("audit.end")}</p>}
    </>}
  </div>;
}
