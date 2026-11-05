# Tabby 云同步设置

[English](README.en.md) | 简体中文

在 Windows、macOS 和 Linux 之间同步 Tabby 设置与 SSH 连接。

本项目基于上游项目 [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings)。来源说明见 [NOTICE](NOTICE)。

## 主要功能

- 将 Tabby 设置和 `~/.ssh/config` 一起加密同步到云端。
- WSL 等本机专属配置只保留在本机。
- 自动跳过指向本机自身的 SSH 连接。
- 根据操作系统适配 SSH 密钥路径。
- 应用云端配置前自动备份本地文件。
- 支持 S3 兼容存储、WebDAV、FTP/FTPS 和 Gist；Dropbox 需要自己在构建时提供 `DROPBOX_APP_KEY`

## 安装

在 Tabby 中打开 **Settings → Plugins**，搜索 `Cloud Settings Sync Plus`，点击安装并重启 Tabby。

也可以在 Tabby 的插件目录执行：

```powershell
npm install --prefix "$env:APPDATA\tabby\plugins" terminus-cloud-settings-sync-plus
```

npm 包名：`terminus-cloud-settings-sync-plus`。

## 构建

需要 Node.js 和 Yarn。普通本地构建可运行 `npm run build:local`；构建 Dropbox 版本需要提供自己的 `DROPBOX_APP_KEY`。

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
