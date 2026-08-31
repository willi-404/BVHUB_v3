# PRODUCT.md — bvHub v2

## 1. Produktvision

**bvHub** ist eine schlanke, moderne Web-App für die Verwaltung eines Badmintonvereins.

Das System wird **komplett neu von Grund auf entwickelt**. Es soll nicht technisch vom alten bvHub abhängig sein, übernimmt aber dessen bewährte Logik und die wichtigsten Funktionen.

Ziel ist eine:

* einfache Bedienung für Mitglieder und Gäste
* schnelle Administration
* mobile-first Oberfläche
* zuverlässige Echtzeit-Datenaktualisierung
* langfristig wartbare Architektur
* unkompliziert selbst hostbare Lösung

---

## 2. Zielgruppe

### Vereinsverwaltung

* Vorstand
* Administratoren


### Nutzer

* Vereinsmitglieder
* Gäste / Interessierte

---

## 3. Rollenmodell

Hierarchie:

```text
SUPER_ADMIN
    ↓
ADMIN
    ↓
MEMBER
    ↓
GUEST
```

### SUPER_ADMIN

Vollständige Systemrechte.

Darf insbesondere:

* Administratoren ernennen
* Administratorrechte entfernen
* Benutzerrollen ändern
* Systemeinstellungen verwalten
* alle administrativen Funktionen ausführen

### ADMIN

Nahezu vollständige operative Rechte.

Darf insbesondere:

* Benutzer verwalten
* Events verwalten
* Teilnehmer verwalten
* Gruppen verwalten
* Mitgliedschaften verwalten

Darf **keine ADMIN- oder SUPER_ADMIN-Rechte vergeben**.

### MEMBER

Registriertes Vereinsmitglied mit erweiterten Funktionen gegenüber Gästen.

### GUEST

Registrierter oder zugelassener Gast mit eingeschränkten Funktionen.

---

## 4. Gruppenmodell

Benutzer können gleichzeitig Mitglied mehrerer Gruppen sein.

Beispiele:

```text
MemberER
MemberNUE
Vorstand
```

Ein Benutzer kann beispielsweise gleichzeitig:

```text
MemberErlangen
+
MemberNUE
+
Vorstand
```

sein.

Gruppen sind unabhängig von der globalen Benutzerrolle.

---

## 5. Kernfunktionen

### Benutzerverwaltung

* Benutzer erstellen
* Benutzer bearbeiten
* Benutzer deaktivieren
* Rollen vergeben
* Gruppen zuweisen
* mehrere Gruppen pro Benutzer
* Mitglieder und Gäste unterscheiden
* Benutzer suchen und filtern

---
### registierung

Must have:
- username/Anzeigename
- VOrname
- Nachname
- Email (bestaetigungscode wird benoetigt um diese email adresse zu verifizieren, code gueltig fuer 15 minuten)
- Adresse: Strasse, Nr.  PLZ, Ort
- Geburtstag

optional:
- Telefonnummer
- weitere Kontaktinformationen

---


### Authentifizierung

* Login (wird in diese version ausscliesslich ueber onetimeCode per Mail realisiert, nur admin und superadmin koennen sich mit passwort anmelden)
* Logout
* sichere Session-Verwaltung
* Passwort ändern (nur für Admins und Superadmins)
* Passwort zurücksetzen     (nur für Admins und Superadmins)
* rollenbasierte Zugriffskontrolle

---

### Events / Spieltermine

Administratoren können:

* Events erstellen
* Events bearbeiten
* Events absagen
* maximale Teilnehmerzahl definieren
* Ort / Halle festlegen
* Zeit festlegen
* Anmeldung öffnen oder schließen

Benutzer können:

* kommende Events ansehen
* sich anmelden
* sich abmelden
* eigenen Anmeldestatus sehen

---

### Teilnehmerverwaltung

Admins können:

* Teilnehmer hinzufügen
* Teilnehmer entfernen
* Teilnehmerstatus ändern
* Teilnehmerlisten verwalten

Änderungen müssen **sofort im Frontend sichtbar sein**.

Kein manueller Browser-Refresh darf notwendig sein.

---

### Teilnehmerliste

Je nach Berechtigung können sichtbar sein:

* Anzeigename
* Mitgliedsstatus (Mitglied / Gast / admin/superadmin)
* Gruppen
* Teilnehmerstatus

Datenschutzrelevante Informationen dürfen nur entsprechend der Rollen und Einstellungen angezeigt werden.

---

## 6. Echtzeit-Anforderungen

Ein Hauptproblem des alten Systems war veralteter Frontend-State.

Beispiel:

```text
Admin entfernt Teilnehmer
→ Backend wurde korrekt aktualisiert
→ Frontend zeigte weiterhin alte Teilnehmerliste
→ manueller Refresh notwendig
```

Dieses Verhalten darf im neuen System nicht auftreten.

Deshalb:

```text
PocketBase
    ↓
Realtime Events
    ↓
TanStack Query Cache Update / Invalidierung
    ↓
UI aktualisiert sich automatisch
```

Mutationen müssen entweder:

* Query-Cache invalidieren
* Query-Daten direkt aktualisieren
* oder über PocketBase Realtime synchronisiert werden.

---

## 7. Technischer Stack

### Frontend

```text
React
TypeScript
Vite
TanStack Query
React Router
```

Optional:

```text
Zustand
```

nur für lokalen UI-State.

Serverdaten sollen grundsätzlich über **TanStack Query** verwaltet werden.

---

### Backend

```text
PocketBase
```

PocketBase übernimmt:

* Authentifizierung
* Datenbank
* Collections
* File Storage
* Realtime Events
* API

Eigene Backend-Logik kann später über PocketBase Hooks oder Extensions ergänzt werden.

---

## 8. UI / UX

Die Anwendung soll sich wie eine moderne mobile App anfühlen.

Prioritäten:

1. Mobile
2. Desktop
3. Tablet

Designprinzipien:

* klare Navigation
* große Touch-Flächen
* wenig visuelle Komplexität
* schnelle Aktionen
* keine unnötigen Dialoge
* verständliche Statusanzeigen
* konsistentes Design

Wichtige Informationen sollen ohne mehrere Untermenüs erreichbar sein.

---

## 9. Internationalisierung

Von Beginn an vorbereiten für:

```text
Deutsch
Englisch
Chinesisch
```

Keine UI-Texte direkt in Komponenten hardcoden.

Beispiel:

```text
locales/
  de.json
  en.json
  zh-CN.json
```

Deutsch kann zunächst Standardsprache sein.

---

## 10. Empfohlene Datenstruktur

### users

```text
id
email
vorname
nachname
role
active
avatar
created
updated
```

### groups

```text
id
name
description
active
```

### user_groups

```text
user
group
```

Many-to-Many-Beziehung zwischen Benutzern und Gruppen.

### venues

```text
id
name
address
active
```

### events

```text
id
title
venue
start
end
capacity
registration_open
status
created_by
```

### registrations

```text
id
event
user
status
created
updated
```

Mögliche Status:

```text
registered
waiting
cancelled
admin_added
```

---

## 11. Architekturprinzipien

### Frontend und Backend klar trennen

```text
React UI
   ↓
API Layer
   ↓
PocketBase SDK
   ↓
PocketBase
```

PocketBase-Aufrufe nicht überall direkt in React-Komponenten verteilen.

Empfohlene Struktur:

```text
src/
  api/
  components/
  features/
  hooks/
  layouts/
  pages/
  routes/
  types/
  lib/
  i18n/
```

---

## 12. Feature-Struktur

Beispiel:

```text
features/
  auth/
  users/
  groups/
  events/
  registrations/
  venues/
```

Jedes Feature enthält möglichst:

```text
api
queries
mutations
components
types
```

---

## 13. MVP

Die erste produktive Version benötigt nur:

### Phase 1

* PocketBase Setup
* Benutzer
* Login
* Rollen
* Gruppen

### Phase 2

* Eventverwaltung
* Veranstaltungsorte
* Anmeldung / Abmeldung

### Phase 3

* Teilnehmerverwaltung
* Realtime-Synchronisierung
* Mobile UI

### Phase 4

* Mehrsprachigkeit
* Admin-Dashboard
* Produktionsdeployment

Danach kann die erste produktive Version veröffentlicht werden.

---

## 14. Spätere Funktionen

Nicht Bestandteil des ersten MVP:

* Rechnungen
* Beiträge
* Mitgliedsanträge
* Wallet / Guthaben
* Zahlungsanbieter
* Buchhaltung
* Trainingsverwaltung
* Turniere
* Statistiken
* Push-Benachrichtigungen
* E-Mail-Automatisierung

Die Architektur soll diese Erweiterungen später ermöglichen.

---

## 15. Deployment

Initial:

```text
React Build
+
PocketBase
+
Reverse Proxy
+
Cloudflare
```

Deployment auf eigenem Linux-Server.

Anforderungen:

* HTTPS
* Backups
* persistente PocketBase-Daten
* automatischer Neustart
* produktive Environment-Konfiguration

---

## 16. Entwicklungsprinzip

Priorität:

```text
funktionierendes Produkt
>
perfekte Architektur
>
unnötige Abstraktion
```

Aber:

* keine Quick-Fixes, die spätere Entwicklung blockieren
* klare Datenmodelle
* klare Rollenprüfung
* zentrale API-Schicht
* reproduzierbares Deployment
* automatische Tests für kritische Logik

---

## 17. Definition of Done

Ein Feature gilt erst als fertig, wenn:

* Funktion implementiert
* Desktop getestet
* Mobile getestet
* Rollenrechte geprüft
* Fehlerzustände behandelt
* Loading-State vorhanden
* Daten nach Mutation sofort aktuell
* kein manueller Refresh erforderlich
* TypeScript ohne Fehler
* Production Build erfolgreich

---

## 18. Wichtigstes Produktprinzip

> **Der Benutzer darf niemals überlegen müssen, ob die angezeigten Daten noch aktuell sind.**

Nach jeder Aktion muss die Oberfläche unmittelbar den tatsächlichen Zustand des Systems widerspiegeln.

Das gilt insbesondere für:

* Eventanmeldungen
* Teilnehmerlisten
* Rollenänderungen
* Gruppenänderungen
* Benutzerverwaltung
