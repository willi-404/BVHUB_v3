# bvHub

Frontend des Badminton Vereins Erlangen. Die bestehenden Event-, Zahlungs- und Admin-Fachbereiche verwenden weiterhin Mock-Daten; Authentifizierung und Sessionverwaltung laufen in WU-02 erstmals gegen PocketBase. Die Fachbereiche selbst bleiben bis zu den folgenden WUs Mock-Daten.

## Voraussetzungen

- Node.js 22.23.3 (die Version ist in `frontend/.mise.toml` festgelegt)
- pnpm 12.9.1 (die Version ist in `frontend/.mise.toml` und `frontend/package.json` festgelegt)

## Lokal entwickeln

```bash
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Der Entwicklungsserver ist anschliessend unter `http://localhost:8443` erreichbar.

## PocketBase und Authentifizierung

PocketBase ist auf `v0.40.1` gepinnt. Binary und lokale Datenbank werden nicht versioniert; Migrationen und serverseitige Auth-Hooks liegen unter `pocketbase/`.

```bash
./scripts/setup-pocketbase.sh
./scripts/start-pocketbase.sh
```

Das Frontend verwendet standardmäßig `http://127.0.0.1:18099`. Für eine andere Instanz kann `VITE_POCKETBASE_URL` gesetzt werden. Gäste und Mitglieder melden sich per E-Mail-OTP (15 Minuten Gültigkeit) an; Admins und Super-Admins verwenden den getrennten Passwort-Flow. `_superusers` ist ausschließlich für die lokale PocketBase-Administration und niemals im Browser vorgesehen. Für einen absichtlichen Port-Override kann `PB_HTTP=127.0.0.1:18100 ./scripts/start-pocketbase.sh` verwendet werden.

Details zu Migrationen, API-Regeln und dem lokalen Setup stehen in [pocketbase/README.md](pocketbase/README.md).

Sicherheitsrelevante PocketBase-Administratoreinstellungen (Rate-Limiting,
API-Regeln und das CSRF-Hook-Muster) sind in
[docs/SECURITY_CONFIGURATION.md](docs/SECURITY_CONFIGURATION.md) dokumentiert
und müssen manuell im Dashboard oder per Migration gesetzt werden.

## Pruefen und bauen

```bash
cd frontend
corepack pnpm typecheck
corepack pnpm build
# oder beides zusammen
corepack pnpm check
```

`pnpm check` führt Typecheck, die Auth-/Guard-Regressionstests und den Production-Build aus.

## Release workflow

Release Drafter aktualisiert nach einem Merge nach `master` den Entwurf fuer
den naechsten GitHub Release. Releases werden weiterhin manuell veroeffentlicht.
PR-Titel und Commit-Nachrichten muessen Conventional Commits verwenden, damit
die Release Notes korrekt kategorisiert werden. Die verbindlichen Regeln,
Labels und die Checkliste stehen in
[docs/RELEASE_WORKFLOW.md](docs/RELEASE_WORKFLOW.md).

## Production-Preview

```bash
cd frontend
corepack pnpm preview
```

## Deployment

Das Skript `scripts/deploy-preview.sh` installiert, prueft und baut lokal und uebertraegt danach standardmaessig nur `frontend/dist/` auf den Server. Dort liefert Nginx das Frontend auf `127.0.0.1:23010` aus; der Cloudflare Tunnel auf demselben Server stellt es unter `portal.bv-erlangen2025.de` bereit. Ohne `BVHUB_DEPLOY_HOST` wird nur der lokale Build ausgefuehrt.

```bash
export BVHUB_DEPLOY_HOST='root@SERVER_IP'
# optional: export BVHUB_REMOTE_ROOT='/var/www/bvhub-v3'
./scripts/deploy-preview.sh
```

Das Skript schaltet den Symlink `current` erst nach erfolgreichem Upload und Entpacken atomar um. Vorhandene Releases werden nicht automatisch geloescht.

Das lokale, nicht versionierte `build_deploy.sh` bleibt der regulaere Ein-Kommando-Deploy fuer Frontend und geaenderten PocketBase-Code. Vor der ersten Ausfuehrung unter der neuen Domain muss in PocketBase die App URL `https://portal.bv-erlangen2025.de` gesetzt und die Verifikations-E-Mail geprueft sein.

Auf dem Remote-Server muss zusaetzlich `PB_ALLOWED_ORIGINS=https://portal.bv-erlangen2025.de` in `/etc/bvhub-v3/pocketbase.env` gesetzt und `bvhub-v3-pocketbase.service` neu gestartet sein. Die App URL steuert E-Mail-Links; `PB_ALLOWED_ORIGINS` steuert separat, ob der Browser Login-Anfragen an `data-v3` senden darf. Beide Deployment-Skripte pruefen die erlaubte Origin vor dem Upload.
