# Tabby Cloud Settings Sync

English | [简体中文](README.zh-CN.md)

Sync Tabby settings and SSH connections between Windows, macOS, and Linux.

## Key features

- Syncs Tabby settings and `~/.ssh/config` together in encrypted cloud storage.
- Keeps WSL and other machine-specific local profiles on their own devices.
- Skips SSH entries that point back to the current computer.
- Adapts SSH key paths for each operating system.
- Creates local backups before applying cloud changes.
- Supports S3-compatible storage, WebDAV, FTP/FTPS, Gists, and Dropbox.

## Build

Requires Node.js and Yarn. Dropbox builds also require `DROPBOX_APP_KEY`.

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## License

MIT. See [LICENSE](LICENSE).
