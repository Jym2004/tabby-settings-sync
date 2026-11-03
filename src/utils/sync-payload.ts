import * as os from 'os'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { hashConfigContent } from './config-hash'

export interface SyncPayload {
    tabbyConfig: string,
    sshConfig: string,
    valid: boolean,
}

const SSH_CONFIG_START = '# --- TABBY CLOUD SYNC: SSH CONFIG START ---'
const SSH_CONFIG_END = '# --- TABBY CLOUD SYNC: SSH CONFIG END ---'

/** Resolve the OpenSSH config used by Tabby's built-in OpenSSH importer. */
export function getOpenSshConfigPath (): string {
    const configuredHome = process.platform === 'win32'
        ? process.env.USERPROFILE || process.env.HOME || os.homedir()
        : process.env.HOME || os.homedir()
    return path.join(configuredHome, '.ssh', 'config')
}

/** Append the OpenSSH config as YAML comments, keeping legacy cloud files valid YAML. */
export function createSyncPayload (tabbyConfig: string, sshConfig: string = null): string {
    if (sshConfig === null) {
        return tabbyConfig
    }

    const encoded = Buffer.from(sshConfig, 'utf8').toString('base64')
    const lines = [SSH_CONFIG_START]
    for (let offset = 0; offset < encoded.length; offset += 72) {
        lines.push('# ' + encoded.slice(offset, offset + 72))
    }
    if (!encoded.length) {
        lines.push('#')
    }
    lines.push(SSH_CONFIG_END)

    return (tabbyConfig || '').replace(/\s*$/, '') + '\n\n' + lines.join('\n') + '\n'
}

/** Separate the Tabby YAML from the optional SSH payload; old cloud YAML has no marker. */
export function splitSyncPayload (content: string): SyncPayload {
    const lines = (content || '').replace(/\r\n/g, '\n').split('\n')
    const start = lines.indexOf(SSH_CONFIG_START)
    if (start < 0) {
        return { tabbyConfig: content || '', sshConfig: null, valid: true }
    }

    const end = lines.indexOf(SSH_CONFIG_END, start + 1)
    if (end < 0) {
        return { tabbyConfig: content || '', sshConfig: null, valid: false }
    }

    const encodedLines = lines.slice(start + 1, end).map(line => {
        if (line === '#') {
            return ''
        }
        return line.startsWith('# ') ? line.substr(2).trim() : null
    })
    if (encodedLines.some(line => line === null)) {
        return { tabbyConfig: content || '', sshConfig: null, valid: false }
    }

    const encoded = encodedLines.join('')
    if ((encoded && (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0))
        || lines.indexOf(SSH_CONFIG_START, end + 1) >= 0
        || lines.indexOf(SSH_CONFIG_END, end + 1) >= 0) {
        return { tabbyConfig: content || '', sshConfig: null, valid: false }
    }

    const sshConfig = Buffer.from(encoded, 'base64').toString('utf8')
    if (Buffer.from(sshConfig, 'utf8').toString('base64') !== encoded) {
        return { tabbyConfig: content || '', sshConfig: null, valid: false }
    }

    return {
        tabbyConfig: lines.slice(0, start).concat(lines.slice(end + 1)).join('\n').replace(/\s*$/, ''),
        sshConfig,
        valid: true,
    }
}

/** Include the SSH sidecar in the existing canonical config fingerprint. */
export function hashSyncContent (content: string): string {
    const payload = splitSyncPayload(content)
    if (payload.sshConfig === null) {
        return hashConfigContent(payload.tabbyConfig)
    }

    let tabbyConfig: any = payload.tabbyConfig
    try {
        tabbyConfig = yaml.load(payload.tabbyConfig)
    } catch (e) { }

    return hashConfigContent(JSON.stringify({
        tabbyConfig,
        sshConfig: payload.sshConfig.replace(/\r\n/g, '\n'),
    }))
}
