# Tabby 云同步设置

[English](README.md) | 简体中文

在 Windows、macOS 和 Linux 之间同步 Tabby 设置与 SSH 连接。

## 主要功能

- 将 Tabby 设置和 `~/.ssh/config` 一起加密同步到云端。
- WSL 等本机专属配置只保留在本机。
- 自动跳过指向本机自身的 SSH 连接。
- 根据操作系统适配 SSH 密钥路径。
- 应用云端配置前自动备份本地文件。
- 支持 S3 兼容存储、WebDAV、FTP/FTPS、Gist 和 Dropbox。

## 构建

需要 Node.js 和 Yarn。构建 Dropbox 版本还需提供 `DROPBOX_APP_KEY`。

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
