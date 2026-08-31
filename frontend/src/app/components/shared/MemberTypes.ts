export type Group = "MemberER" | "MemberNUE" | "guest" | "Admin";

export interface Member {
  id: string;
  username: string;
  vorname: string;
  nachname: string;
  email: string;
  gruppe: Group;
  memberSince: string;
  adresse: string;
  geburtstag: string;
  phone: string;
  instagram?: string;
  accountCreated: string;
  accountUpdated: string;
  avatarColor: string;
}

export const MEMBERS: Member[] = [
  { id: "BWC-ER-0312",  username: "sarah.chen",     vorname: "Sarah",  nachname: "Chen",    email: "sarah.chen@email.com",     gruppe: "MemberER",  memberSince: "Jan 2022",   adresse: "Nürnberger Str. 14, 91052 Erlangen",  geburtstag: "12. März 1994",  phone: "+49 176 1234 5678", instagram: "@sarah.chen_badminton", accountCreated: "15. Jan. 2022",  accountUpdated: "28. Aug. 2026", avatarColor: "#15803d" },
  { id: "BWC-NUE-0087", username: "thomas.mueller", vorname: "Thomas", nachname: "Müller",  email: "t.mueller@mail.de",         gruppe: "MemberNUE", memberSince: "März 2023",  adresse: "Hauptstraße 7, 90429 Nürnberg",        geburtstag: "5. Juli 1988",   phone: "+49 162 9876 5432",                         accountCreated: "2. März 2023",   accountUpdated: "10. Aug. 2026", avatarColor: "#1d4ed8" },
  { id: "BWC-GS-0541",  username: "alex.novak",     vorname: "Alex",   nachname: "Novak",   email: "alex.novak@gmail.com",      gruppe: "guest",     memberSince: "Aug. 2026",  adresse: "Schillerplatz 3, 91054 Erlangen",     geburtstag: "22. Nov. 2000",  phone: "+49 170 5555 1234",                         accountCreated: "30. Aug. 2026",  accountUpdated: "30. Aug. 2026", avatarColor: "#b45309" },
  { id: "BWC-ADM-001",  username: "k.hofmann",      vorname: "Klaus",  nachname: "Hofmann", email: "k.hofmann@bv-erlangen.de",  gruppe: "Admin",     memberSince: "Jan. 2025",  adresse: "Erlangen, Bayern",                    geburtstag: "3. Apr. 1975",   phone: "+49 151 2222 3333",                         accountCreated: "1. Jan. 2025",   accountUpdated: "1. Sept. 2026", avatarColor: "#7c3aed" },
  { id: "BWC-ER-0198",  username: "lena.vogel",     vorname: "Lena",   nachname: "Vogel",   email: "lena.vogel@web.de",         gruppe: "MemberER",  memberSince: "Juni 2021",  adresse: "Beethovenstr. 22, 91052 Erlangen",    geburtstag: "8. Aug. 1997",   phone: "+49 177 8881 2233", instagram: "@lena_plays_badminton", accountCreated: "10. Juni 2021",  accountUpdated: "5. Aug. 2026",  avatarColor: "#15803d" },
  { id: "BWC-NUE-0134", username: "markus.braun",   vorname: "Markus", nachname: "Braun",   email: "m.braun@outlook.com",       gruppe: "MemberNUE", memberSince: "Okt. 2022",  adresse: "Fürther Str. 88, 90429 Nürnberg",     geburtstag: "19. Dez. 1991",  phone: "+49 163 4444 7890",                         accountCreated: "20. Okt. 2022",  accountUpdated: "22. Juli 2026", avatarColor: "#1d4ed8" },
  { id: "BWC-ER-0407",  username: "nina.schmidt",   vorname: "Nina",   nachname: "Schmidt", email: "nina.schmidt@gmx.de",       gruppe: "MemberER",  memberSince: "Feb. 2024",  adresse: "Goethestr. 5, 91052 Erlangen",        geburtstag: "14. Jan. 2001",  phone: "+49 174 6677 8899",                         accountCreated: "3. Feb. 2024",   accountUpdated: "12. Aug. 2026", avatarColor: "#15803d" },
  { id: "BWC-GS-0312",  username: "felix.winter",   vorname: "Felix",  nachname: "Winter",  email: "felix.winter@icloud.com",   gruppe: "guest",     memberSince: "Aug. 2026",  adresse: "Nürnberg, Bayern",                    geburtstag: "30. Mai 1999",   phone: "+49 179 3344 5566",                         accountCreated: "29. Aug. 2026",  accountUpdated: "29. Aug. 2026", avatarColor: "#b45309" },
];

export const groupConfig: Record<Group, { label: string; color: string; bg: string }> = {
  MemberER:  { label: "MemberER",  color: "#15803d", bg: "#dcfce7" },
  MemberNUE: { label: "MemberNUE", color: "#1d4ed8", bg: "#dbeafe" },
  guest:     { label: "Guest",     color: "#b45309", bg: "#fef3c7" },
  Admin:     { label: "Admin",     color: "#7c3aed", bg: "#ede9fe" },
};

export function initials(m: Member) {
  return (m.vorname[0] + m.nachname[0]).toUpperCase();
}
