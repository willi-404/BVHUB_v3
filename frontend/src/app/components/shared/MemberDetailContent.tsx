import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useI18n, formatLocaleDate, formatLocaleDateTime } from "../../../i18n";
import type { AdminMemberDetails } from "../../../features/memberCardScanner/types";

type DetailMember = Pick<AdminMemberDetails, "id" | "username" | "displayName" | "firstName" | "lastName" | "email" | "role" | "active" | "verified" | "created" | "updated" | "memberSince" | "groups" | "address" | "birthDate" | "phone">;

function value(value: string | undefined): string { return value?.trim() || "-"; }

export function MemberDetailContent({ member }: { member: DetailMember }) {
  const { t, locale } = useI18n();
  const roleLabel = member.role === "SUPER_ADMIN" ? t("roles.superAdmin") : member.role === "ADMIN" ? t("roles.admin") : member.role === "MEMBER" ? t("roles.member") : t("roles.guest");
  const date = (raw: string) => raw ? (raw.length <= 10 ? formatLocaleDate(`${raw}T12:00:00Z`, locale) : formatLocaleDateTime(raw, locale)) : "-";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{value(member.displayName || `${member.firstName} ${member.lastName}`)}</CardTitle>
          <CardDescription>{value(member.username ? `@${member.username}` : member.email)}</CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={member.active && member.verified ? "success" : "destructive"}>{roleLabel}</Badge>
            <Badge variant="outline">{member.active ? t("profile.active") : t("profile.inactive")}</Badge>
            <Badge variant="outline">{member.verified ? t("profile.verified") : t("profile.unverified")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Detail label={t("admin.members.memberId")} value={member.id} mono />
          <Detail label={t("admin.members.username")} value={member.username ? `@${member.username}` : "-"} />
          <Detail label={t("profile.name")} value={`${value(member.firstName)} ${value(member.lastName)}`} />
          <Detail label={t("auth.email")} value={member.email} />
          <Detail label={t("profile.phone")} value={member.phone} />
          <Detail label={t("profile.address")} value={member.address} />
          <Detail label={t("profile.birthDate")} value={date(member.birthDate)} />
          <Detail label={t("profile.groups")} value={member.groups?.map((group) => group.name).join(", ") || "-"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("profile.account")}</CardTitle></CardHeader>
        <CardContent className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Detail label={t("profile.role")} value={roleLabel} />
          <Detail label={t("admin.members.memberSince")} value={date(member.memberSince)} />
          <Detail label={t("profile.createdAt")} value={date(member.created)} />
          <Detail label={t("profile.updatedAt")} value={date(member.updated)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value: content, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className={`break-words text-sm font-medium ${mono ? "font-mono" : ""}`}>{value(content)}</p></div>;
}
