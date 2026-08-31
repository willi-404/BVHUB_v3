# bvHub

Frontend-Prototyp des Badminton Vereins Erlangen. Die Anwendung ist aktuell eine eigenstaendige React/Vite-Anwendung und verwendet ausschliesslich Mock-Daten. PocketBase, echte Authentifizierung sowie Rollen- und Gruppenlogik sind noch nicht angeschlossen.

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

## Pruefen und bauen

```bash
cd frontend
pnpm typecheck
pnpm build
# oder beides zusammen
pnpm check
```

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
