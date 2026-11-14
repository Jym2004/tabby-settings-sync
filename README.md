# Tabby 云同步设置

[English](README.en.md) | 简体中文

在 Windows、macOS 和 Linux 之间同步 Tabby 设置与 SSH 连接。

本项目基于上游项目 [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings)。来源说明见 [NOTICE](NOTICE)。

## 主要功能

- 将 Tabby 设置和 `~/.ssh/config` 一起加密同步到云端。
- WSL 等本机专属配置只保留在本机。
- 自动跳过指向本机自身的 SSH 连接。
- SSH 密钥和认证选择保留在各设备，不随连接配置覆盖。
- 应用云端配置前自动备份本地文件。
- 支持 S3 兼容存储、WebDAV、FTP/FTPS 和 Gist；Dropbox 需要自己在构建时提供 `DROPBOX_APP_KEY`

## 安装

在 Tabby 中打开 **Settings → Plugins**，搜索 `Cloud Settings Sync Plus`，点击安装并重启 Tabby。

也可以在 Tabby 的插件目录执行：

```powershell
npm install --prefix "$env:APPDATA\tabby\plugins" terminus-cloud-settings-sync-plus
```

npm 包名：`terminus-cloud-settings-sync-plus`。

## 手动同步

保存云存储配置后，设置页会显示 **Sync now** 和 **Force upload from this device**。
关闭 **Automatic sync** 只会停止后台定时同步和配置变更上传，仍可使用设置页、工具栏或命令面板里的手动操作。
**Sync now** 按本地与云端的变更情况同步，遇到双方冲突时保留副本；强制上传会用本机设置覆盖云端副本。

## 新设备的 SSH 认证

云端共享服务器地址、账号、端口和跳板关系，不再同步 SSH 私钥路径、认证方式或 OpenSSH 的本机身份指令（包括 `IdentityFile`、`IdentityAgent`、`Include`）。已有设备的本机绑定会保留。

新设备没有本机绑定时，下载会暂停，当前连接配置保持可用。打开 Cloud Sync Settings 的 **This device's SSH authentication**，逐个连接或批量选择本机私钥、SSH Agent 或密码登录，再点 **Save local identity and continue**。私钥选择的是私钥文件，不是 `.pub` 文件；公钥仍需通过密码登录或管理员加入各服务器的 `authorized_keys`，包括跳板机。

插件不会复制、生成或自动授权密钥；可使用本机 `ssh-keygen` 生成独立密钥。等待绑定期间若修改了本机设置，请取消待处理下载后重新同步。另一台设备若仍使用旧插件，仍可能上传旧式路径；各端均应更新。

## 构建

需要 Node.js 和 Yarn。普通本地构建可运行 `npm run build:local`；构建 Dropbox 版本需要提供自己的 `DROPBOX_APP_KEY`。

```sh
corepack yarn install --ignore-scripts
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
