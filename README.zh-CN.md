# Tabby 云同步设置（Jym2004）

[English](README.md) | 简体中文

本仓库是基于 MIT 许可的上游项目 [Tabby Sync Cloud Settings](https://github.com/niceit/tabby-cloud-sync-settings) 修改的独立版本，适用于 [Tabby](https://github.com/Eugeny/tabby)，支持 macOS、Windows 和 Linux。

> 本仓库不是 GitHub Fork。上游来源和版权信息见 [NOTICE](NOTICE) 与 [LICENSE](LICENSE)。

## 功能

- 将 Tabby 的 `config.yaml` 和本机 OpenSSH `~/.ssh/config` 放入同一个加密云端载荷。
- 检测 SSH 配置变化并自动同步。
- 排除 `type: local` 的机器专属 profile（如 WSL），拉取时保留本机已有的 local profile。
- 拉取时检查 SSH Host 的 `HostName` 是否匹配本机 IP 或主机名；匹配的条目不会写入本机，仍保存在本地加密缓存中并在上传时补回。
- 归一化 `IdentityFile`、`CertificateFile` 和 Tabby SSH `privateKeys` 路径，以便跨系统同步。
- 拉取前备份本地配置；发生冲突时保存冲突快照，避免静默覆盖。
- 支持 Amazon S3、Wasabi、DigitalOcean Spaces、Backblaze B2、S3 兼容存储（包括 MinIO）、WebDAV、FTP/FTPS、GitHub/Gitee Gist、GitLab Snippets 和 Dropbox。

## 同步范围与限制

- **不自动同步或安装插件清单**。`pluginBlacklist` 等普通 Tabby 设置包含在 `config.yaml` 中，但其他设备不会因此自动安装插件。
- SSH `Include` 指令和依赖本机程序路径的 `ProxyCommand` 按原样保留。跨平台配置建议使用 `~/.ssh/...` 路径和 `ProxyJump` Host 别名。
- 本机连接识别使用本机 IP/主机名的精确匹配；解析到本机的 DNS 别名不一定能自动识别。
- 私钥文件不会上传。每台设备都需要自行准备 `~/.ssh` 下对应的密钥。
- Dropbox 构建需要 `DROPBOX_APP_KEY`。不要把 Dropbox app secret 写入插件；app key 是公开的客户端元数据。

## 加密与安全

Tabby 配置和 SSH 配置会先合并，再整体加密后上传。可以在插件的 Security 设置中配置自定义加密密钥；所有同步设备都需要使用同一密钥。丢失该密钥后，云端加密数据无法解密。SSH 私钥文件本身不会上传。

## 构建

需要 Node.js 和 Yarn。Windows 环境若不需要原生可选依赖，可使用：

```sh
corepack yarn install --ignore-scripts
```

构建需要提供 `DROPBOX_APP_KEY`：

```sh
DROPBOX_APP_KEY=your_dropbox_app_key npm run build
```

构建脚本为旧版 Webpack 启用 Node legacy OpenSSL provider；构建后的资源复制由 Node 脚本完成，以兼容 Windows。

Dropbox OAuth 需在 Dropbox App Console 中登记以下 Redirect URI：

```text
http://localhost:53682/dropbox/callback
```

## 上游来源

本仓库基于上游 **v1.8.0** 开始修改。原项目保留为 Git remote `upstream`：

```sh
git fetch upstream
git diff upstream/main --stat
```

上游署名与许可说明见 [NOTICE](NOTICE)。

## 本地改动

- 默认同步 OpenSSH 配置，并在云端使用加密载荷传输。
- 不上传 WSL 等机器专属 local profile；拉取时保留本机已有的 local profile。
- 自动排除指向本机的 SSH Host，并按同步目标在本机加密保存排除条目。
- 归一化 SSH Identity 和 Tabby SSH profile key 路径。
- 将 `node-sass` 替换为 `sass`，支持当前 Node.js 24 构建环境。

## 发布状态

GitHub 源码可以独立发布，但当前仓库是私有的，公开发布前需要仓库所有者先调整仓库可见性。npm 包**暂时不能直接按当前 metadata 发布**：`package.json` 仍使用上游包名 `terminus-cloud-settings-sync` 和版本 `1.8.0`。发布衍生版本前，需要先确定新的 npm 包名和版本；发布构建还需要 `DROPBOX_APP_KEY`。

## 许可证

MIT。上游版权与许可原文保留在 [LICENSE](LICENSE)，修改来源见 [NOTICE](NOTICE)。
