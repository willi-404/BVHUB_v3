import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import logoSrc from "../../imports/logo1-high-resolution.png";
import { useI18n, type MessageKey } from "../../i18n";
import { register, type RegistrationInput } from "../../features/auth/registrationService";

type Field = keyof RegistrationInput;
const required: Field[] = ["username", "firstName", "lastName", "email", "street", "houseNumber", "postalCode", "city", "birthDate"];

function validate(values: RegistrationInput, t: (key: MessageKey) => string): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const field of required) if (!String(values[field] ?? "").trim()) errors[field] = t("register.required");
  if (!errors.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.email = t("register.invalidEmail");
  if (!errors.firstName && !/^[\p{L}][\p{L}\s'’-]{1,79}$/u.test(values.firstName)) errors.firstName = t("register.invalidName");
  if (!errors.lastName && !/^[\p{L}][\p{L}\s'’-]{1,79}$/u.test(values.lastName)) errors.lastName = t("register.invalidName");
  if (!errors.postalCode && !/^\d{5}$/.test(values.postalCode)) errors.postalCode = t("register.invalidPostal");
  if (!errors.houseNumber && !/^\d+[a-zA-Z]?(?:[-–]\d+[a-zA-Z]?)?$/.test(values.houseNumber)) errors.houseNumber = t("register.invalidHouse");
  if (!errors.birthDate || values.birthDate) {
    const date = new Date(`${values.birthDate}T00:00:00Z`);
    if (!errors.birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) || Number.isNaN(date.getTime()) || date >= new Date())) errors.birthDate = t("register.invalidBirthDate");
  }
  if (values.phone && !/^[+()\d][+()\d\s./-]{5,39}$/.test(values.phone)) errors.phone = t("register.invalidPhone");
  return errors;
}

export default function RegisterView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});
  const [values, setValues] = useState<RegistrationInput>({ username: "", displayName: "", firstName: "", lastName: "", email: "", street: "", houseNumber: "", postalCode: "", city: "", birthDate: "", phone: "", contactInfo: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function update(field: Field, value: string) { setValues((prev) => ({ ...prev, [field]: value })); if (submitted) setErrors((prev) => ({ ...prev, [field]: undefined })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (loading) return; setSubmitted(true); setServerError("");
    const next = validate(values, t); setErrors(next);
    const first = required.find((field) => next[field]);
    if (first) { refs.current[first]?.focus(); return; }
    setLoading(true);
    try { const result = await register(values); navigate("/register/success", { state: { email: result.email }, replace: true }); }
    catch (error) { setServerError(error instanceof Error ? error.message : t("register.error")); }
    finally { setLoading(false); }
  }
  const input = (field: Field, label: string, type = "text", optional = false) => {
    const error = errors[field]; const value = String(values[field] ?? "");
    return <div className="flex flex-col gap-1"><label htmlFor={`register-${field}`} className="text-xs font-600 text-[var(--muted-foreground)]">{label}{optional ? ` (${t("register.optional")})` : ""}</label><input id={`register-${field}`} ref={(el) => { refs.current[field] = el; }} type={type} value={value} onChange={(e) => update(field, e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${field}` : undefined} className={`h-11 px-3 rounded-[var(--radius)] border bg-[var(--background)] text-sm outline-none ${error ? "border-red-500 ring-1 ring-red-200" : submitted ? "border-emerald-500 ring-1 ring-emerald-100" : "border-[var(--border)]"}`} />{error && <p id={`error-${field}`} className="text-xs text-red-600">{error}</p>}</div>;
  };
  return <div className="min-h-full flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]"><div className="w-full max-w-2xl"><div className="flex items-center gap-3 mb-6"><img src={logoSrc} alt="BV Erlangen" className="h-12 w-12 object-contain" /><div><h1 className="text-xl font-700">{t("register.title")}</h1><p className="text-sm text-[var(--muted-foreground)]">{t("register.subtitle")}</p></div></div><form onSubmit={submit} noValidate className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius)] p-5 md:p-7 flex flex-col gap-4">{input("username", t("register.username"))}{input("displayName", t("register.displayName"), "text", true)}<div className="grid md:grid-cols-2 gap-4">{input("firstName", t("register.firstName"))}{input("lastName", t("register.lastName"))}</div>{input("email", t("register.email"), "email")}<div className="grid md:grid-cols-2 gap-4">{input("street", t("register.street"))}{input("houseNumber", t("register.houseNumber"))}{input("postalCode", t("register.postalCode"))}{input("city", t("register.city"))}</div>{input("birthDate", t("register.birthDate"), "date")}<div className="grid md:grid-cols-2 gap-4">{input("phone", t("register.phone"), "tel", true)}{input("contactInfo", t("register.contactInfo"), "text", true)}</div>{serverError && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{serverError}</p>}<Button type="submit" size="lg" disabled={loading}>{loading ? `${t("register.submit")} …` : t("register.submit")}</Button><p className="text-sm text-center text-[var(--muted-foreground)]"><Link to="/login" className="text-[var(--primary)] hover:underline">{t("register.backToLogin")}</Link></p></form></div></div>;
}
