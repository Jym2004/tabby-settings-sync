# Tabby Sync Cloud Settings

----

#### ❤️ If you love the project, please Sponsor it so I will have self-fund to keep it long live development. Thanks so much! ❤️

### Plugin for Tabby SSH https://github.com/Eugeny/tabby

<p align="center">
  <a href="https://www.npmjs.com/package/terminus-cloud-settings-sync"><img alt="npm" src="https://img.shields.io/npm/v/terminus-cloud-settings-sync?label=npmjs"></a>
  <a href="https://tabby-sync.github.io/"><img src="https://img.shields.io/static/v1?label=Support URL&message=Visit tabby-sync.github.io&color=#333"/></a> &nbsp;
  <img alt="GitHub" src="https://img.shields.io/github/license/niceit/tabby-cloud-sync-settings">
  <img alt="Scrutinizer code quality (GitHub/Bitbucket)" src="https://img.shields.io/scrutinizer/quality/g/niceit/tabby-cloud-sync-settings">
  <a href="https://www.codefactor.io/repository/github/niceit/tabby-cloud-sync-settings"><img src="https://www.codefactor.io/repository/github/niceit/tabby-cloud-sync-settings/badge" alt="CodeFactor" /></a>
  <img alt="npm" src="https://img.shields.io/npm/dt/terminus-cloud-settings-sync">
</p>

With this plugin you could sync your settings (Including saved SSH Sessions) automatically across devices.

Current platforms supported: **MacOS** **Windows** **Linux**

This plugin is **FREE** of use under public license MIT.

## Publishing

Dropbox OAuth uses PKCE, so published builds only need the Dropbox app key; do not embed the Dropbox app secret in the plugin.

Register this exact redirect URI in the Dropbox App Console under **OAuth 2 → Redirect URIs**:

```text
http://localhost:53682/dropbox/callback
```

During connection, the plugin temporarily listens on that loopback address, validates the OAuth `state`, completes the token exchange automatically, and then closes the listener. Manual callback paste remains available as a fallback if the local port cannot be opened.

Set `DROPBOX_APP_KEY` in the environment before building, watching, or publishing:

```sh
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
DROPBOX_APP_KEY=your_dropbox_app_key npm run watch
DROPBOX_APP_KEY=your_dropbox_app_key npm publish
```

The environment variable belongs to the build/watch process, not the Tabby process. If a webpack watcher was started without `DROPBOX_APP_KEY`, stop it and restart it with the variable; otherwise each rebuild overwrites `dist/index.js` with an empty app key.

For GitHub Actions, store the value as a repository secret named `DROPBOX_APP_KEY` and expose it only to the publish step:

```yaml
- name: Publish package
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    DROPBOX_APP_KEY: ${{ secrets.DROPBOX_APP_KEY }}
```

`prepublishOnly` fails when `DROPBOX_APP_KEY` is missing, preventing a release with Dropbox authentication disabled. The app key is compiled into `dist/index.js` and must be treated as public client metadata, not as a secret.

## Current supported Cloud Services

----

![](./screenshots/cloud-services/cloud-services-s3.png)
![](./screenshots/cloud-services/cloud-services-webdav.png)
![](./screenshots/cloud-services/cloud-services-ftp.png)
![](./screenshots/cloud-services/cloud-services-wasabi.png)
![](./screenshots/cloud-services/cloud-services-digitalocean.png)
![](./screenshots/cloud-services/cloud-services-blackblaze.png)
![](./screenshots/cloud-services/cloud-services-github.png)
![](./screenshots/cloud-services/cloud-services-gitlab.png)
![](./screenshots/cloud-services/cloud-services-koofr.png)
![](./screenshots/cloud-services/cloud-services-dropbox.png)

## Checkout some screenshots

----

![](./screenshots/2021-08-07_11-12-03.png)

![](./screenshots/2021-08-07_11-14-51.png)

![](./screenshots/2021-08-07_11-52-28.png)

![](./screenshots/2021-08-07_11-53-34.png)

Plugin support vary amount of cloud services. More clouds will be supported soon in the future.

Any feedback will be appreciated for next version releases.
Hope you will like this plugin for your productivity work.

### Love the plugin? Buy me a coffee.

----

[![Donate to TranIT](https://tranit.co/donate-tranit.png)](https://donorbox.org/tabby-cloud-sync-settings-donation)

# Change logs

----

Keep tracking of version release change logs

## [v1.8.0] - 2026-09-02

- Added secure Dropbox PKCE authentication with automatic callback handling and a manual fallback.
- Added custom AES-256-GCM encryption with operating-system keychain storage and legacy-data compatibility.
- Added a secure unlock flow for encrypted Dropbox data to prevent accidental cloud overwrites.
- Improved conflict detection, safe conflict backups, synchronization pausing, and local snapshot recovery.
- Added toolbar and command-palette actions for syncing and opening Cloud Sync settings.
- Prevented conflicts with Tabby's built-in configuration sync and improved retry behavior after repeated failures.
- Expanded provider disconnect cleanup while keeping cloud files untouched.
- Improved the settings interface, accessibility, synchronization status, publishing workflow, and automated test coverage.

## [v1.6.5] - 2024-10-14

- Dropbox official supported.
- Plugin logs supported.
- Optimize the sync feature.
- Fix known bugs
- UI Adjustments according to Tabby newer version.


## [v1.6.0] - 2023-02-17

- Fix WebDav init sync issue.
- Improve self checking for update.
- Add support for rollback to previous version.
- Sponsor list added.
- Minor bug fixes.

## [v1.5.2] - 2022-11-19

- Add custom config for setting interval syncing time.
- Added Check for update tab.
- Support check for update and inline update for the plugin.
- Minor bug fixes.

## [v1.5.1] - 2022-08-16

- Inline Feedback, change logs, donate button, and more.
- Improve UI for better user experience.
- Minor fixes and bugs.

## [v1.5.0] - 2022-07-17

- Official support for **S3 Compatibility Minio, and others...**
- Minor fixes and bugs.

## [v1.4.3] - ...

- Minor fixes and bugs.

## [v1.4.0] - 2022-05-22

- Auto sync support (Detect sync settings from other machine from cloud).
- Critical bugs fix.
- Minor fixes and bugs.

## [v1.3.0] - 2021-12-21

- Support FTP / FTPs Port setting
- Add support for Gists (GitHub, GitLab)
- Backup the Tabby settings for first time sync.
- Minor fixes and bugs.

## [v1.2.2] - 2021-08-24

## Added

- Add support for [Blackblaze B2 Storage](https://www.backblaze.com/b2/cloud-storage.html).

## [v1.2.1] - 2021-08-21

## Added

- Add support for [Digital Ocean Space](https://www.digitalocean.com/products/spaces/).

## [v1.2.0] - 2021-08-19

## Added

- Add support for [Wasabi Cloud Storage](https://wasabi.com/).

## [v1.1.3] - 2021-08-14

### Fixes

- Add logger.
- Minor fixes and bugs.

## [v1.0.2] - 2021-08-07

### Fixes

- Optimize for security setting file encryption.
- Fixing bugs.

## [v1.0.0] - 2021-08-01

### Added

- Initial the plugin package
- Added Support for Amazon S3, FTP, WebDav

# 上游来源 / Upstream

----

This repository is an independent, modified copy of
**[niceit/tabby-cloud-sync-settings](https://github.com/niceit/tabby-cloud-sync-settings)**,
maintained by [Jym2004](https://github.com/Jym2004).

- 上游项目 / Upstream: https://github.com/niceit/tabby-cloud-sync-settings
- 起始版本 / Starting version: **v1.8.0** (2026-09-02)
- 上游作者 / Upstream author: TranIT.Co <tran.tuan@tranit.co>
- 许可证 / License: MIT — 原始版权声明保留在 [LICENSE](./LICENSE) 中，未做修改
- 详细说明 / Details: [NOTICE](./NOTICE)

It is **not a GitHub fork**: this is a standalone repository, and the original
project is added as the git remote `upstream` so upstream changes can be
compared and merged at any time.

```sh
git fetch upstream
git diff upstream/main --stat     # 与上游的差异
```

## 本地改动 / Local modifications

本仓库在上游 v1.8.0 基础上的改动（每条改动对应一次 commit）：

- 默认将 `~/.ssh/config` 与 Tabby 的 `config.yaml` 一起加密同步；Tabby 会从这份 OpenSSH 配置识别 `A6000` 等连接
- 从云端副本排除 `type: local` 的机器专属 profiles（例如 WSL）；拉取时保留本机现有的 local profiles
- 不同步插件安装清单；`pluginBlacklist` 等普通 Tabby 配置仍包含在 `config.yaml` 中
- 拉取 SSH 配置前创建 `.tabby-sync-backup` 备份；两端同时修改时额外保留 SSH 冲突快照，不静默覆盖
- 拉取时自动排除 `HostName` 指向本机 IP 或主机名的 SSH 条目（避免出现“连接自己”），排除项记录在本地并在上传时补回，不会删除其他设备上的连接
- 构建依赖由 `node-sass` 切换为 `sass`，以支持当前 Node.js 版本

All local modifications are released under the MIT License, Copyright (c) 2026 Jym2004.
