# Electricity on VPS (PocketBase)

Lightweight deploy next to Marzban. Does not replace or reconfigure Xray/Marzban stream routing.

## Public URL

- App: `https://10423450138.website-project.com/electricity/`
- API: `https://10423450138.website-project.com/pb/`

## What was added

| Path | Purpose |
| --- | --- |
| `/opt/electricity/pocketbase` | PocketBase binary + `pb_data` |
| `/etc/systemd/system/electricity-pocketbase.service` | Service with `MemoryMax=96M` |
| `/var/www/electricity` | Built static UI |
| `/etc/nginx/conf.d/local.conf` | Only extra `location` blocks for `/electricity/` and `/pb/` |
| `/opt/electricity/rollback.sh` | One-command removal |

Nginx backup before patch: `/etc/nginx/conf.d/local.conf.bak.electricity`

## Rollback (VPN untouched)

```bash
ssh root@104.234.50.138
/opt/electricity/rollback.sh
```

## Rebuild / redeploy UI

From the repo root:

```bash
VITE_BACKEND=pocketbase \
VITE_POCKETBASE_URL=https://10423450138.website-project.com/pb \
npm run build:electricity -- --base=/electricity/

tar -C dist -czf /tmp/electricity-dist.tgz electricity
scp /tmp/electricity-dist.tgz root@104.234.50.138:/tmp/
ssh root@104.234.50.138 'rm -rf /var/www/electricity && tar -C /var/www -xzf /tmp/electricity-dist.tgz'
```

## Notes

- GitHub Pages can keep using Supabase; VPS build selects PocketBase via `VITE_POCKETBASE_URL`.
- App user email: `uhha88@mail.ru`. Temporary password is on the server in `/opt/electricity/user.pass` (root-only). Change it after first login.
- Supabase history is not auto-imported without a Supabase user password or service-role export.
