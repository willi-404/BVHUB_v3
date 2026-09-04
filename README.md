# bvHub

Frontend des Badminton Vereins Erlangen. Die bestehenden Event-, Zahlungs- und Admin-Fachbereiche verwenden weiterhin Mock-Daten; Authentifizierung und Sessionverwaltung laufen in WU-02 erstmals gegen PocketBase. Die Fachbereiche selbst bleiben bis zu den folgenden WUs Mock-Daten.

## Voraussetzungen

- Node.js 22
- pnpm 10.34.3 (die Version ist in `frontend/.mise.toml` festgelegt)

## Lokal entwickeln

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
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
pnpm typecheck
pnpm build
# oder beides zusammen
pnpm check
```

`pnpm check` führt Typecheck, die Auth-/Guard-Regressionstests und den Production-Build aus.

## Production-Preview

```bash
cd frontend
pnpm preview
```

## Deployment

Das dauerhafte Skript `scripts/deploy-preview.sh` installiert, prueft und baut lokal und uebertraegt danach nur `frontend/dist/` auf einen nativen Nginx-Server. Ohne `BVHUB_DEPLOY_HOST` wird nur der lokale Build ausgefuehrt.

```bash
export BVHUB_DEPLOY_HOST='root@SERVER_IP'
# optional: export BVHUB_REMOTE_ROOT='/var/www/bvhub-v3'
./scripts/deploy-preview.sh
```

Das Skript schaltet den Symlink `current` erst nach erfolgreichem Upload und Entpacken atomar um. Vorhandene Releases werden nicht automatisch geloescht.
