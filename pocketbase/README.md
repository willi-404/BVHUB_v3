# Lokales PocketBase

Die PocketBase-Version ist in `VERSION` auf `0.40.1` festgelegt. Das Binary und `pb_data/` werden bewusst nicht versioniert; Migrationen und Hooks sind reproduzierbar im Repository enthalten.

## Einrichtung und Start

Voraussetzungen: `curl`, `unzip` und ein passendes Linux- oder macOS-System.

```bash
./scripts/setup-pocketbase.sh
./scripts/start-pocketbase.sh
```

PocketBase läuft lokal unter `http://127.0.0.1:8090`. Beim ersten Start den Superuser interaktiv über das PocketBase-Dashboard oder mit dem offiziellen `superuser create`-Befehl anlegen. Keine Superuser-Zugangsdaten in dieses Repository oder in den Browser übernehmen.

Die Migration `1710000000_create_auth_foundation.js` legt `users` als Auth-Collection sowie `groups` und `user_groups` für die spätere Many-to-Many-Zuordnung an. `pb_hooks/auth-policy.pb.js` erzwingt die Rollen-/Methodentrennung serverseitig.

## Frontend verbinden

```bash
cd frontend
printf 'VITE_POCKETBASE_URL=http://127.0.0.1:8090\n' > .env.local
pnpm dev
```

`_superusers` ist ausschließlich für die lokale/administrative PocketBase-Verwaltung vorgesehen und wird niemals durch den Browser-Client verwendet.
