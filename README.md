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
- 支持 S3 兼容存储、WebDAV、FTP/FTPS、Gist 和 Dropbox。

## 本地安装

Tabby 的插件搜索使用 npm 仓库，不会搜索 GitHub 仓库。此版本尚未以独立 npm 包发布前，在 Tabby 中搜索到的会是上游版本，而不是这里修改的版本。

在本仓库根目录执行以下命令，即可本地构建并安装到 Tabby 插件目录：

```powershell
corepack yarn install --ignore-scripts
npm run build:local
npm install --prefix "$env:APPDATA\tabby\plugins" .
```

安装后重启 Tabby。`build:local` 不包含 Dropbox OAuth；如需 Dropbox 支持，设置自己的 `DROPBOX_APP_KEY` 后运行 `npm run build`。

## 构建

需要 Node.js 和 Yarn。普通本地构建可运行 `npm run build:local`；构建 Dropbox 版本需要提供自己的 `DROPBOX_APP_KEY`。

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
