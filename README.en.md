# Tabby Cloud Settings Sync

English | [简体中文](README.md)

Sync Tabby settings and SSH connections between Windows, macOS, and Linux.

Based on [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings). See [NOTICE](NOTICE) for attribution.

## Key features

- Syncs Tabby settings and `~/.ssh/config` together in encrypted cloud storage.
- Keeps WSL and other machine-specific local profiles on their own devices.
- Skips SSH entries that point back to the current computer.
- Keeps SSH keys and authentication choices local to each device.
- Creates local backups before applying cloud changes.
- Supports S3-compatible storage, WebDAV, FTP/FTPS, and Gists. Dropbox requires your own `DROPBOX_APP_KEY` at build time.

## Install

Open **Settings → Plugins** in Tabby, search for `Cloud Settings Sync Plus`, install it, then restart Tabby.

You can also install it from the command line in Tabby's plugin directory:

```powershell
npm install --prefix "$env:APPDATA\tabby\plugins" terminus-cloud-settings-sync-plus
```

npm package: `terminus-cloud-settings-sync-plus`.

## Manual sync

After saving a storage provider, the settings page offers **Sync now** and **Force upload from this device**.
Turning off **Automatic sync** stops background polling and uploads on configuration changes; manual actions remain available in settings, the toolbar, and the command palette.
**Sync now** reconciles local and cloud changes and preserves copies on conflict. Force upload replaces the cloud copy with this device's settings.

## SSH authentication on a new device

Shared settings contain connection addresses, users, ports and jump hosts, without SSH key paths, authentication choices, or device-specific OpenSSH directives such as `IdentityFile`, `IdentityAgent` and `Include`. Existing local bindings are preserved.

When a receiving device has no local identity, the download waits without replacing live connections. Open **This device's SSH authentication** in Cloud Sync Settings, select a local private key (not a `.pub` file), SSH agent, or password authentication for each waiting connection or for all of them, then choose **Save local identity and continue**. Authorize the device's public key on each server, including jump hosts, separately through a password login or administrator.

The plugin never copies, generates or authorizes keys. Use the local `ssh-keygen` tool to generate a separate device key if needed. If local settings change during setup, cancel the waiting download and sync again. Update all devices: older plugin versions may still upload legacy key paths.

## Build

Requires Node.js and Yarn. Use `npm run build:local` for a local build; Dropbox builds require your own `DROPBOX_APP_KEY`.

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## License

MIT. See [LICENSE](LICENSE).
