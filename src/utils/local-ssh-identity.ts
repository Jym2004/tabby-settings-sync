import * as yaml from 'js-yaml'

export interface LocalSshBinding {
    auth: 'publicKey' | 'agent' | 'password' | 'keyboardInteractive'
    privateKeys?: string[]
    directives?: string[]
}

export interface PendingSshBinding {
    id: string
    label: string
}

export interface DeviceSshIdentities {
    bindings: Record<string, LocalSshBinding>
    pending: PendingSshBinding[]
}

export class LocalSshSetupRequired extends Error {
    readonly code = 'SYNC_LOCAL_SSH_SETUP_REQUIRED'
    constructor () {
        super('Choose this device\'s SSH key or authentication method in Cloud Sync Settings before applying the downloaded connections. Private keys are not synced; authorize this device\'s public key on each server, including jump hosts.')
    }
}

export function requiresLocalSshSetup (error: any): boolean {
    return error?.code === 'SYNC_LOCAL_SSH_SETUP_REQUIRED'
}

const identityDirective = /^\s*(IdentityFile|CertificateFile|IdentityAgent|IdentitiesOnly|PreferredAuthentications|PubkeyAuthentication|PasswordAuthentication|KbdInteractiveAuthentication|PKCS11Provider|SecurityKeyProvider|Include)(?:\s*=\s*|\s+)/i
const profileFields = ['privateKeys', 'privateKey', 'auth', 'password']

function mapping (content: string): any {
    const value = yaml.load(content || '')
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('The Tabby configuration is not a YAML mapping.')
    }
    return value
}

function endpoint (options: any): string {
    return JSON.stringify([options.host?.trim().toLowerCase(), options.port || 22, options.user || '', options.jumpHost || '', options.proxyCommand || ''])
}

function profileId (profile: any): string {
    return 'tabby:' + (profile.id || profile.name) + ':' + endpoint(profile.options || {})
}

function profileBinding (options: any, usable: (value: string) => boolean): LocalSshBinding | null {
    const keys = options.privateKeys || (options.privateKey ? [options.privateKey] : [])
    if (['password', 'keyboardInteractive'].includes(options.auth)) return { auth: options.auth }
    if (options.auth === 'agent') return keys.every(key => typeof key === 'string' && usable(key))
        ? { auth: 'agent', privateKeys: keys }
        : null
    if (keys.length) {
        return keys.every(key => typeof key === 'string' && !key.endsWith('.pub') && usable(key.replace(/%h/g, options.host || '').replace(/%r/g, options.user || '')))
            ? { auth: 'publicKey', privateKeys: keys }
            : null
    }
    return null
}

/** Never put a source device's authentication method, paths or password in cloud profiles. */
export function stripTabbySshIdentities (content: string): string {
    const config = mapping(content)
    const strip = options => {
        if (options) for (const field of profileFields) delete options[field]
    }
    for (const profile of config.profiles || []) {
        if (profile.type === 'ssh') strip(profile.options)
    }
    strip(config.profileDefaults?.ssh)
    strip(config.profileDefaults?.ssh?.options)
    for (const group of config.groups || []) {
        strip(group.defaults?.ssh)
        strip(group.defaults?.ssh?.options)
        if (group.defaults?.ssh?.options && !Object.keys(group.defaults.ssh.options).length) delete group.defaults.ssh.options
        if (group.defaults?.ssh && !Object.keys(group.defaults.ssh).length) delete group.defaults.ssh
        if (group.defaults && !Object.keys(group.defaults).length) delete group.defaults
    }
    if (config.profileDefaults?.ssh?.options && !Object.keys(config.profileDefaults.ssh.options).length) delete config.profileDefaults.ssh.options
    if (config.profileDefaults?.ssh && !Object.keys(config.profileDefaults.ssh).length) delete config.profileDefaults.ssh
    if (config.profileDefaults && !Object.keys(config.profileDefaults).length) delete config.profileDefaults
    return yaml.dump(config, { lineWidth: -1, noRefs: true })
}

export function mergeTabbySshIdentities (
    localContent: string, cloudContent: string, state: DeviceSshIdentities, usable: (value: string) => boolean,
): string {
    const local = mapping(localContent || 'profiles: []')
    const cloud = mapping(stripTabbySshIdentities(cloudContent))
    const localProfiles = (local.profiles || []).filter(profile => profile.type === 'ssh')
    for (const profile of cloud.profiles || []) {
        if (profile.type !== 'ssh') continue
        const id = profileId(profile)
        const existing = localProfiles.find(item => profileId(item) === id)
        const defaults = local.profileDefaults?.ssh?.options || local.profileDefaults?.ssh || {}
        const groups = []
        const seen = new Set<string>()
        let group = existing && (local.groups || []).find(item => item.id === existing.group)
        while (group && !seen.has(group.id)) {
            seen.add(group.id)
            groups.unshift(group.defaults?.ssh?.options || group.defaults?.ssh || {})
            group = (local.groups || []).find(item => item.id === group.parentGroupId)
        }
        const current = existing ? profileBinding(Object.assign({}, defaults, ...groups, existing.options), usable) : null
        const saved = state.bindings[id]
        const binding = current || (saved && profileBinding({ ...profile.options, ...saved }, usable))
        if (!binding) {
            state.pending.push({ id, label: profile.name || profile.options?.host || id })
            continue
        }
        state.bindings[id] = binding
        profile.options = { ...profile.options, auth: binding.auth, privateKeys: binding.privateKeys || [] }
        // Local password-only profiles can continue using their existing storage.
        if (existing?.options?.password != null && binding.auth === 'password') profile.options.password = existing.options.password
    }
    // Keep existing default identity choices local too; cloud defaults cannot replace them.
    if (local.profileDefaults?.ssh) {
        cloud.profileDefaults = cloud.profileDefaults || {}
        cloud.profileDefaults.ssh = cloud.profileDefaults.ssh || {}
        for (const field of profileFields) {
            if (local.profileDefaults.ssh[field] !== undefined) cloud.profileDefaults.ssh[field] = local.profileDefaults.ssh[field]
            if (local.profileDefaults.ssh.options?.[field] !== undefined) {
                cloud.profileDefaults.ssh.options = cloud.profileDefaults.ssh.options || {}
                cloud.profileDefaults.ssh.options[field] = local.profileDefaults.ssh.options[field]
            }
        }
    }
    for (const group of cloud.groups || []) {
        const localGroup = (local.groups || []).find(item => item.id === group.id)
        if (!localGroup?.defaults?.ssh) continue
        group.defaults = group.defaults || {}
        group.defaults.ssh = group.defaults.ssh || {}
        for (const field of profileFields) {
            if (localGroup.defaults.ssh[field] !== undefined) group.defaults.ssh[field] = localGroup.defaults.ssh[field]
            if (localGroup.defaults.ssh.options?.[field] !== undefined) {
                group.defaults.ssh.options = group.defaults.ssh.options || {}
                group.defaults.ssh.options[field] = localGroup.defaults.ssh.options[field]
            }
        }
    }
    return yaml.dump(cloud, { lineWidth: -1, noRefs: true })
}

interface Section { key: string, lines: string[] }
function sections (content: string): Section[] {
    const result: Section[] = [{ key: 'global', lines: [] }]
    for (const line of (content || '').replace(/\r\n/g, '\n').split('\n')) {
        const match = line.match(/^\s*(Host|Match)(?:\s*=\s*|\s+)(.+?)\s*$/i)
        if (match) result.push({ key: match[1].toLowerCase() + ':' + match[2].toLowerCase().replace(/\s+/g, ' '), lines: [] })
        result[result.length - 1].lines.push(line)
    }
    return result
}

function sectionId (section: Section): string {
    const connection = section.lines.filter(line => /^\s*(HostName|User|Port|ProxyJump|ProxyCommand)(?:\s*=\s*|\s+)/i.test(line))
        .map(line => line.trim().replace(/^(\w+)(?:\s*=\s*|\s+)/, (_, name) => name.toLowerCase() + ' ').replace(/\s+/g, ' ')).sort()
    return 'openssh:' + section.key + ':' + JSON.stringify(connection)
}

function operand (line: string): string {
    const match = line.match(/^\s*\w+(?:\s*=\s*|\s+)(?:"([^"]*)"|'([^']*)'|(\S+))/)
    return match ? match[1] ?? match[2] ?? match[3] : ''
}

function directiveBinding (lines: string[], usable: (value: string) => boolean): LocalSshBinding | null {
    const identities = lines.filter(line => identityDirective.test(line))
    const files = identities.filter(line => /^\s*(IdentityFile|CertificateFile)(?:\s*=\s*|\s+)/i.test(line))
    if (files.length && files.some(line => operand(line).toLowerCase() !== 'none' && !usable(operand(line)))) return null
    if (!identities.length || (!files.length && identities.every(line => /^\s*IdentitiesOnly\s+/i.test(line)))) return null
    return { auth: files.length ? 'publicKey' : 'agent', directives: identities }
}

function matchesHost (section: Section, alias: string): boolean {
    if (section.key === 'global') return true
    if (!section.key.startsWith('host:')) return false
    let positive = false
    for (const pattern of section.key.slice(5).split(' ')) {
        const negate = pattern.startsWith('!')
        const value = negate ? pattern.slice(1) : pattern
        const regex = new RegExp('^' + value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i')
        if (regex.test(alias)) {
            if (negate) return false
            positive = true
        }
    }
    return positive
}

/** OpenSSH identities are device state, including global and wildcard identities. */
export function stripOpenSshIdentities (content: string): string {
    return sections(content).filter(section => {
        if (section.key === 'global' || (section.key.startsWith('host:') && !/[?*!]/.test(section.key))) return true
        return section.lines.slice(1).some(line => line.trim() && !line.trim().startsWith('#') && !identityDirective.test(line))
    }).map(section => section.lines.filter(line => !identityDirective.test(line)).join('\n')).filter(content => content.trim()).join('\n').replace(/\n*$/, '\n')
}

export function mergeOpenSshIdentities (
    localContent: string, cloudContent: string, state: DeviceSshIdentities, usable: (value: string) => boolean,
): string {
    const local = sections(localContent)
    const cloud = sections(stripOpenSshIdentities(cloudContent))
    for (const section of cloud) {
        const id = sectionId(section)
        const existing = local.find(item => sectionId(item) === id)
        const saved = state.bindings[id]
        const binding = (existing && directiveBinding(existing.lines, usable))
            || (saved && directiveBinding(saved.directives || bindingDirectives(saved), usable))
        const concrete = section.key.startsWith('host:') && !/[?*!]/.test(section.key)
        if (!binding) {
            const inherited = existing && concrete && section.key.slice(5).split(' ').every(alias => {
                const rules = local.filter(rule => rule.key === 'global' || (rule.key.startsWith('host:') && /[?*!]/.test(rule.key) && matchesHost(rule, alias)))
                return !!directiveBinding(rules.flatMap(rule => rule.lines), usable)
            })
            if (concrete && !inherited) state.pending.push({ id, label: 'OpenSSH ' + section.key.slice(5) })
            continue
        }
        state.bindings[id] = binding
        const insert = section.key === 'global' ? 0 : 1
        section.lines.splice(insert, 0, ...(binding.directives || []))
    }
    // Local wildcard/global identity rules need not exist in the cloud copy.
    // Preserve their scope rather than attaching them to unrelated hosts.
    const localGlobal = local.find(section => section.key === 'global')
    const cloudGlobal = cloud.find(section => section.key === 'global')
    if (localGlobal && !cloudGlobal.lines.some(line => identityDirective.test(line))) {
        cloudGlobal.lines.unshift(...localGlobal.lines.filter(line => identityDirective.test(line)))
    }
    for (const section of local) {
        if (section.key === 'global' || cloud.some(item => item.key === section.key)) continue
        if (!section.key.startsWith('match:') && !/[?*!]/.test(section.key)) continue
        const directives = section.lines.filter(line => identityDirective.test(line))
        if (directives.length) cloud.push({ key: section.key, lines: [section.lines[0], ...directives] })
    }
    return cloud.map(section => section.lines.join('\n')).join('\n').replace(/\n*$/, '\n')
}

function bindingDirectives (binding: LocalSshBinding): string[] {
    if (binding.auth === 'publicKey') return [
        ...(binding.privateKeys || []).map(key => '    IdentityFile "' + key.replace(/\\/g, '/') + '"'),
        '    IdentitiesOnly yes',
        '    PreferredAuthentications publickey',
    ]
    if (binding.auth === 'agent') return ['    PreferredAuthentications publickey', '    IdentitiesOnly no']
    return ['    PubkeyAuthentication no', '    PreferredAuthentications ' + (binding.auth === 'password' ? 'password,keyboard-interactive' : 'keyboard-interactive')]
}

export function deviceBindingDirectives (binding: LocalSshBinding): LocalSshBinding {
    if (!['publicKey', 'agent', 'password', 'keyboardInteractive'].includes(binding.auth)) throw new Error('Unsupported local SSH authentication method.')
    if (binding.privateKeys?.some(key => /["\r\n]/.test(key))) throw new Error('The selected key path contains unsupported characters.')
    return { ...binding, directives: bindingDirectives(binding) }
}
