import * as os from 'os'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { hashConfigContent } from './config-hash'

export interface SyncPayload {
    tabbyConfig: string,
    sshConfig: string,
    valid: boolean,
}

export interface SshConfigBlock {
    key: string,
    lines: string[],
}

const SSH_CONFIG_START = '# --- TABBY CLOUD SYNC: SSH CONFIG START ---'
const SSH_CONFIG_END = '# --- TABBY CLOUD SYNC: SSH CONFIG END ---'

function parseTabbyConfig (content: string): any {
    try {
        const parsed = yaml.load(content || '')
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch (e) {
        return null
    }
}

function dumpTabbyConfig (config: any): string {
    return yaml.dump(config, { lineWidth: -1, noRefs: true })
}

/** Convert an absolute key path into a portable `~` path for the cloud copy. */
function normaliseLocalPath (value: string): string {
    if (!value) {
        return value
    }

    const cleaned = value.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/')
    const home = os.homedir().replace(/\\/g, '/').replace(/\/$/, '')
    if (cleaned.toLowerCase().startsWith(home.toLowerCase() + '/')) {
        return '~/' + cleaned.slice(home.length + 1)
    }

    const windowsHome = cleaned.match(/^[A-Za-z]:\/Users\/[^/]+\/(.+)$/)
    if (windowsHome) {
        return '~/' + windowsHome[1]
    }

    const unixHome = cleaned.match(/^\/(?:Users|home)\/[^/]+\/(.+)$/)
    if (unixHome) {
        return '~/' + unixHome[1]
    }

    return cleaned
}

/** Expand a portable `~` path for the current operating system. */
function expandLocalPath (value: string): string {
    if (!value) {
        return value
    }

    const home = os.homedir().replace(/\\/g, '/')
    if (value === '~') {
        return home
    }
    if (value.startsWith('~/')) {
        return home + value.slice(1)
    }

    return value.replace(/\\/g, '/')
}

function mapProfilePaths (config: any, mapper: (value: string) => string): any {
    if (!config || !Array.isArray(config.profiles)) {
        return config
    }

    let changed = false
    const profiles = config.profiles.map(profile => {
        const options = profile?.options
        if (!options) {
            return profile
        }

        const nextOptions = { ...options }
        if (Array.isArray(options.privateKeys)) {
            const privateKeys = options.privateKeys.map(mapper)
            if (privateKeys.some((key, index) => key !== options.privateKeys[index])) {
                nextOptions.privateKeys = privateKeys
                changed = true
            }
        }
        if (typeof options.privateKey === 'string') {
            const privateKey = mapper(options.privateKey)
            if (privateKey !== options.privateKey) {
                nextOptions.privateKey = privateKey
                changed = true
            }
        }

        return changed ? { ...profile, options: nextOptions } : profile
    })

    return changed ? { ...config, profiles } : config
}

/** Make Tabby SSH profile key paths portable before uploading. */
export function normaliseTabbyConfigPaths (content: string): string {
    const config = parseTabbyConfig(content)
    if (!config) {
        return content || ''
    }

    const normalised = mapProfilePaths(config, normaliseLocalPath)
    return normalised === config ? (content || '') : dumpTabbyConfig(normalised)
}

/** Expand portable key paths for the local operating system after pulling. */
export function expandTabbyConfigPaths (content: string): string {
    const config = parseTabbyConfig(content)
    if (!config) {
        return content || ''
    }

    const expanded = mapProfilePaths(config, expandLocalPath)
    return expanded === config ? (content || '') : dumpTabbyConfig(expanded)
}

/** Make IdentityFile/CertificateFile paths portable in OpenSSH config. */
export function normaliseSshConfigPaths (content: string): string {
    return (content || '').replace(/\r\n/g, '\n').split('\n').map(line => {
        const match = line.match(/^(\s*(?:IdentityFile|CertificateFile)\s+)(.+)$/i)
        return match ? match[1] + normaliseLocalPath(match[2]) : line
    }).join('\n')
}

/** Expand `~` key paths for the local operating system before writing OpenSSH config. */
export function expandSshConfigPaths (content: string): string {
    return (content || '').replace(/\r\n/g, '\n').split('\n').map(line => {
        const match = line.match(/^(\s*(?:IdentityFile|CertificateFile)\s+)(.+)$/i)
        return match ? match[1] + expandLocalPath(match[2]) : line
    }).join('\n')
}

/** Addresses and names that identify this computer rather than a remote host. */
export function getLocalHostIdentifiers (): Set<string> {
    const identifiers = new Set<string>(['localhost', '127.0.0.1', '::1'])
    try {
        identifiers.add(os.hostname().toLowerCase())
    } catch (e) { }

    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
        for (const address of interfaces[name] || []) {
            if (address?.address) {
                identifiers.add(address.address.toLowerCase())
            }
        }
    }

    return identifiers
}

function splitSshSections (content: string): { preamble: string[], blocks: SshConfigBlock[] } {
    const preamble: string[] = []
    const blocks: SshConfigBlock[] = []
    let current: SshConfigBlock = null

    for (const line of (content || '').replace(/\r\n/g, '\n').split('\n')) {
        const host = line.match(/^\s*Host\s+(.+?)\s*$/i)
        const match = line.match(/^\s*Match\s+(.+?)\s*$/i)
        if (host || match) {
            const aliases = host
                ? host[1].toLowerCase().split(/\s+/).sort().join(' ')
                : match[1].toLowerCase().replace(/\s+/g, ' ')
            current = { key: (host ? 'host:' : 'match:') + aliases, lines: [line] }
            blocks.push(current)
        } else if (current) {
            current.lines.push(line)
        } else {
            preamble.push(line)
        }
    }

    return { preamble, blocks }
}

function isSelfReferencingBlock (block: SshConfigBlock, identifiers: Set<string>): boolean {
    const aliases = block.key.replace(/^host:/, '').split(' ')
    const hostNames = block.lines
        .map(line => line.match(/^\s*HostName\s+(\S+)/i))
        .filter(Boolean)
        .map(match => match[1].replace(/^["']|["']$/g, '').toLowerCase())

    const targets = hostNames.length ? hostNames : aliases
    return targets.some(target => identifiers.has(target))
}

/** Remove cloud Host blocks that point at this computer; return them for re-uploading. */
export function excludeSelfReferencingSshConfig (cloudConfig: string, identifiers = getLocalHostIdentifiers()): { config: string, excluded: SshConfigBlock[] } {
    const { preamble, blocks } = splitSshSections(cloudConfig)
    const kept: SshConfigBlock[] = []
    const excluded: SshConfigBlock[] = []
    for (const block of blocks) {
        if (isSelfReferencingBlock(block, identifiers)) {
            excluded.push(block)
        } else {
            kept.push(block)
        }
    }

    const lines = preamble.slice()
    for (const block of kept) {
        lines.push(...block.lines)
    }

    return {
        config: lines.join('\n').replace(/\n*$/, '\n'),
        excluded,
    }
}

/** Put excluded cloud blocks back when uploading so other devices keep their connections. */
export function restoreExcludedSshBlocks (localConfig: string, excluded: SshConfigBlock[]): string {
    if (!excluded?.length) {
        return localConfig || ''
    }

    const { preamble, blocks } = splitSshSections(localConfig)
    const localKeys = new Set(blocks.map(block => block.key))
    const lines = preamble.slice()
    for (const block of blocks) {
        lines.push(...block.lines)
    }
    for (const block of excluded) {
        if (!localKeys.has(block.key)) {
            lines.push(...block.lines)
        }
    }

    return lines.join('\n').replace(/\n*$/, '\n')
}

/** Exclude machine-specific local-shell profiles from the cloud copy. */
export function stripLocalProfiles (content: string): string {
    const config = parseTabbyConfig(content)
    if (!config || !Array.isArray(config.profiles)) {
        return content || ''
    }

    const profiles = config.profiles.filter(profile => profile?.type !== 'local')
    if (profiles.length === config.profiles.length) {
        return content || ''
    }

    return dumpTabbyConfig({ ...config, profiles })
}

/** Apply cloud settings while retaining this device's own local-shell profiles. */
export function mergeLocalProfiles (localContent: string, cloudContent: string): string {
    const localConfig = parseTabbyConfig(localContent)
    const cloudConfig = parseTabbyConfig(cloudContent)
    if (!cloudConfig) {
        return cloudContent || ''
    }

    const localProfiles = Array.isArray(localConfig?.profiles)
        ? localConfig.profiles.filter(profile => profile?.type === 'local')
        : []
    const cloudProfiles = Array.isArray(cloudConfig.profiles)
        ? cloudConfig.profiles.filter(profile => profile?.type !== 'local')
        : []
    const cloudIds = new Set(cloudProfiles.map(profile => profile?.id).filter(Boolean))
    const preservedLocalProfiles = localProfiles.filter(profile => !profile?.id || !cloudIds.has(profile.id))

    return dumpTabbyConfig({
        ...cloudConfig,
        profiles: cloudProfiles.concat(preservedLocalProfiles),
    })
}

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
    const cloudTabbyConfig = stripLocalProfiles(payload.tabbyConfig)
    if (payload.sshConfig === null) {
        return hashConfigContent(cloudTabbyConfig)
    }

    const tabbyConfig = parseTabbyConfig(cloudTabbyConfig) || cloudTabbyConfig

    return hashConfigContent(JSON.stringify({
        tabbyConfig,
        sshConfig: payload.sshConfig.replace(/\r\n/g, '\n'),
    }))
}
