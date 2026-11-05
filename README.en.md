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
- Supports S3-compatible storage, WebDAV, FTP/FTPS, Gists, and Dropbox.

## Install a local build

Tabby's Plugins search uses the npm registry; it does not search GitHub repositories. Until this version is published under its own npm package name, search results will show the upstream package, not this modified build.

From the repository root, build and install into Tabby's user plugin directory:

```powershell
corepack yarn install --ignore-scripts
npm run build:local
npm install --prefix "$env:APPDATA\tabby\plugins" .
```

Restart Tabby after installation. `build:local` omits Dropbox OAuth. To enable Dropbox, set your own `DROPBOX_APP_KEY` and run `npm run build`.

## Build

Requires Node.js and Yarn. Use `npm run build:local` for a local build; Dropbox builds require your own `DROPBOX_APP_KEY`.

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## License

MIT. See [LICENSE](LICENSE).
