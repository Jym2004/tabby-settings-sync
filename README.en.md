# Tabby Cloud Settings Sync

English | [简体中文](README.md)

Sync Tabby settings and SSH connections between Windows, macOS, and Linux.

Based on [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings). See [NOTICE](NOTICE) for attribution.

## Key features

- Syncs Tabby settings and `~/.ssh/config` together in encrypted cloud storage.
- Keeps WSL and other machine-specific local profiles on their own devices.
- Skips SSH entries that point back to the current computer.
- Adapts SSH key paths for each operating system.
- Creates local backups before applying cloud changes.
- Supports S3-compatible storage, WebDAV, FTP/FTPS, and Gists. Dropbox requires your own `DROPBOX_APP_KEY` at build time.

## Install

Open **Settings → Plugins** in Tabby, search for `Cloud Settings Sync Plus`, install it, then restart Tabby.

You can also install it from the command line in Tabby's plugin directory:

```powershell
npm install --prefix "$env:APPDATA\tabby\plugins" terminus-cloud-settings-sync-plus
```

npm package: `terminus-cloud-settings-sync-plus`.

## Build

Requires Node.js and Yarn. Use `npm run build:local` for a local build; Dropbox builds require your own `DROPBOX_APP_KEY`.

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## License

MIT. See [LICENSE](LICENSE).
