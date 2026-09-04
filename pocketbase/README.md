# Lokales PocketBase

Dieses Repository verwendet PocketBase Server `0.40.1` und den PocketBase-JS-SDK `0.28.0`. Das Binary und `pb_data/` sind absichtlich nicht versioniert. Migrationen und serverseitige Hooks liegen reproduzierbar im Repository.

## Einrichtung

1. PocketBase `0.40.1` installieren:

   ```bash
   ./scripts/setup-pocketbase.sh
   ```

2. Die neue, vom alten Dienst getrennte Instanz unter `127.0.0.1:18099` starten:

   ```bash
   ./scripts/setup-pocketbase.sh
   ./scripts/start-pocketbase.sh
   ```

   Das Skript verwendet ausschließlich das Repository-lokale `pocketbase/pb_data`. Der Port kann bewusst überschrieben werden, zum Beispiel für einen Testprozess:

   ```bash
   PB_HTTP=127.0.0.1:18100 ./scripts/start-pocketbase.sh
   ```

3. Verifizieren:

   ```bash
   curl http://127.0.0.1:18099/api/health
   ```

4. Das erste technische PocketBase-Superuserkonto sicher mit dem offiziellen CLI-Befehl anlegen:

   ```bash
   cd pocketbase

   read -r -p 'PocketBase-Superuser-E-Mail: ' PB_SUPERUSER_EMAIL
   read -r -s -p 'PocketBase-Superuser-Passwort: ' PB_SUPERUSER_PASSWORD
   printf '\n'

   ./pocketbase superuser create \
     "$PB_SUPERUSER_EMAIL" \
     "$PB_SUPERUSER_PASSWORD"

   unset PB_SUPERUSER_EMAIL
   unset PB_SUPERUSER_PASSWORD
   ```

   `superuser create` ist für die erstmalige Erstellung gedacht. `superuser upsert` darf nur bewusst verwendet werden: Bei einem vorhandenen Konto kann es auch das Passwort aktualisieren.

5. Keine echten Passwörter, Tokens, Installer-Links, `.env.local` oder `pb_data` committen.

6. Mit diesem PocketBase-Superuser im Dashboard der neuen Instanz anmelden:

   ```text
   http://127.0.0.1:18099/_/
   ```

7. In der Collection `users` den ersten BVHUB-Superadmin anlegen:

   - `email`
   - starkes Passwort mit mindestens 12 Zeichen
   - `passwordConfirm`
   - `displayName`
   - `firstName`
   - `lastName`
   - `role = SUPER_ADMIN`
   - `active = true`
   - `verified = true`

   Das ist ein normales BVHUB-Anwendungskonto (`users.role=SUPER_ADMIN`) und nicht das technische PocketBase-Konto (`_superusers`).

8. Frontend starten:

   ```bash
   cd frontend
   printf 'VITE_POCKETBASE_URL=http://127.0.0.1:18099\n' > .env.local
   pnpm dev
   ```

9. Die Anmeldung des BVHUB-Superadmins über den Passwort-Flow prüfen. OTP ist ausschließlich für aktive `GUEST`- und `MEMBER`-Konten vorgesehen; Passwortlogin ausschließlich für aktive `ADMIN`- und `SUPER_ADMIN`-Konten.

## Konten und Sicherheit

`_superusers` ist das technische Administratorkonto für PocketBase-Dashboard und Serververwaltung. `users.role=SUPER_ADMIN` ist das normale BVHUB-Anwendungskonto für den Frontend-Login. `_superusers` darf niemals durch den normalen BVHUB-Browser-Client verwendet werden.

Das Passwort eines PocketBase-Superusers wird bewusst über das Dashboard oder `./pocketbase superuser upsert EMAIL PASSWORT` geändert. Bei Verlust muss ein autorisierter Betreiber die offizielle Superuser-Recovery (`superuser create` mit einem neuen Konto oder `superuser upsert`) verwenden; Zugangsdaten gehören nicht in das Repository.

Für Produktion: PocketBase-Superuser-IP-Whitelist, MFA, HTTPS hinter einem Reverse Proxy, regelmäßige Backups und restriktive Dateirechte für `pb_data` einrichten. Die neue Instanz darf kein gemeinsames `pb_data` mit einer anderen PocketBase-Instanz verwenden.

## Migrationen und Tests

`1710000000_create_auth_foundation.js` erstellt beziehungsweise repariert `users`, `groups` und `user_groups` in einem frischen temporären `pb_data`. Die Bool-Felder `active` akzeptieren ausdrücklich `true` und `false`; ein eindeutiger Index verhindert doppelte Benutzer-Gruppen-Zuordnungen. Die API-Regeln und Hooks verlangen für geschützte Aktionen einen aktiven Request-User und erzwingen die serverseitige RBAC-Trennung.

Die isolierten Integrationstests verwenden einen eigenen konfigurierbaren Port (Standard `18101`) und ein temporäres Datenverzeichnis:

```bash
PB_TEST_PORT=18101 ./scripts/test-pocketbase-integration.sh
```

Temporäre Prozesse und Daten werden auch bei Fehlern bereinigt. Eine alte, separat laufende Instanz wird weder beendet noch verändert.
