# Tabby Cloud Settings Sync (Jym2004)

English | [简体中文](README.zh-CN.md)

An independent, modified version of the MIT-licensed [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings) plugin for [Tabby](https://github.com/Eugeny/tabby). It syncs Tabby settings and OpenSSH connections between macOS, Windows, and Linux.

> This repository is not a GitHub fork. Upstream attribution and license details are in [NOTICE](NOTICE) and [LICENSE](LICENSE).

## Features

- Syncs the full Tabby `config.yaml` and the local OpenSSH `~/.ssh/config` in one encrypted cloud payload.
- Detects OpenSSH config edits and triggers synchronization.
- Excludes Tabby profiles of type `local` (for example, machine-specific WSL profiles) from the cloud copy and preserves each device's existing local profiles when pulling.
- Detects SSH `Host` entries whose `HostName` matches the receiving computer's IP addresses or hostname. Those entries stay in the cloud for other devices but are omitted locally to avoid creating a self-connection.
- Normalizes SSH `IdentityFile`, `CertificateFile`, and Tabby SSH `privateKeys` home paths for cross-OS use.
- Backs up local configuration before applying a cloud pull and saves conflict snapshots when both sides change.
- Supports S3-compatible storage, WebDAV, FTP/FTPS, GitHub/Gitee/GitLab snippets, and Dropbox.

## Cloud providers

Amazon S3, Wasabi, DigitalOcean Spaces, Backblaze B2, S3-compatible storage (including MinIO), WebDAV, FTP/FTPS, GitHub Gist, Gitee Gist, GitLab Snippets, and Dropbox.

### Scope and limitations

- Installed plugin manifests are not synchronized. Tabby's `pluginBlacklist` setting is part of `config.yaml`, but plugins are not installed automatically on another device.
- SSH `Include` directives and OS-specific `ProxyCommand` executables are copied as written. Prefer portable paths such as `~/.ssh/...` and `ProxyJump` aliases for cross-platform configs.
- Self-connection detection is based on exact local IP/hostname matches; DNS aliases that resolve to the local computer may not be detected.
- Private key files are not uploaded. Each device must have the referenced keys in its own `~/.ssh` directory.
- Dropbox builds require a `DROPBOX_APP_KEY`. Do not put the Dropbox app secret in the plugin; the app key is public client metadata.

## Security

The Tabby config and SSH config are encrypted together before upload. A custom encryption secret can be configured in the plugin's Security settings. Keep that secret available on every device; without it, the encrypted cloud data cannot be decrypted. SSH private key files themselves are never uploaded.

## Build

Requirements: Node.js and Yarn. On Windows, install dependencies with scripts disabled if native optional packages are not needed:

```sh
corepack yarn install --ignore-scripts
```

Set `DROPBOX_APP_KEY` for builds that include Dropbox support:

```sh
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

The Dropbox app key is public client metadata, not an app secret. The build script enables Node's legacy OpenSSL provider for compatibility with the upstream Webpack version; the post-build copy step is implemented with Node for Windows compatibility.

For Dropbox OAuth, register this redirect URI in the Dropbox App Console:

```text
http://localhost:53682/dropbox/callback
```

## Upstream

This repository started from upstream version **v1.8.0**. The original project is available as the `upstream` Git remote:

```sh
git fetch upstream
git diff upstream/main --stat
```

See [NOTICE](NOTICE) for attribution and license information.

## Local changes

- Sync OpenSSH configuration alongside Tabby settings by default.
- Keep machine-specific local profiles, such as WSL, out of the cloud payload.
- Exclude self-referencing SSH hosts on pull while retaining them in a target-scoped, locally encrypted cache for re-upload.
- Normalize home-directory paths in SSH identity and Tabby SSH key settings.
- Replace `node-sass` with `sass` for Node.js 24 build compatibility.

## Release status

The source can be released on GitHub independently, but this repository is currently private and must be made public by its owner first. The npm package is **not ready to publish under its current metadata**: `package.json` still uses the upstream package name `terminus-cloud-settings-sync` and version `1.8.0`. Publishing a derivative requires choosing a new npm package name and version first. A release build also requires `DROPBOX_APP_KEY`.

## License

MIT. The upstream copyright and permission notice remains in [LICENSE](LICENSE). See [NOTICE](NOTICE) for the modification attribution.

## 中文说明

请参阅 [简体中文 README](README.zh-CN.md)。
