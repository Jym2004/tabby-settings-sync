import {
    createSyncPayload,
    excludeSelfReferencingSshConfig,
    expandSshConfigPaths,
    expandTabbyConfigPaths,
    getOpenSshConfigPath,
    hashSyncContent,
    mergeLocalProfiles,
    normaliseSshConfigPaths,
    normaliseTabbyConfigPaths,
    restoreExcludedSshBlocks,
    splitSyncPayload,
    stripLocalProfiles,
} from '../src/utils/sync-payload'
import * as yaml from 'js-yaml'

describe('sync payload', () => {
    it('round-trips Tabby YAML and OpenSSH content', () => {
        const tabbyConfig = 'version: 8\nprofiles: []\n'
        const sshConfig = '# managed locally\nHost A6000\n    HostName 10.0.0.1\n    User jh\n'

        const payload = splitSyncPayload(createSyncPayload(tabbyConfig, sshConfig))

        expect(payload.valid).toBe(true)
        expect(payload.tabbyConfig).toBe(tabbyConfig.trim())
        expect(payload.sshConfig).toBe(sshConfig)
        expect(yaml.load(createSyncPayload(tabbyConfig, sshConfig))).toEqual({ version: 8, profiles: [] })
    })

    it('keeps legacy Tabby-only payloads readable', () => {
        const tabbyConfig = 'version: 8\nprofiles: []\n'
        const payload = splitSyncPayload(tabbyConfig)

        expect(payload.valid).toBe(true)
        expect(payload.tabbyConfig).toBe(tabbyConfig)
        expect(payload.sshConfig).toBeNull()
    })

    it('rejects a truncated SSH sidecar', () => {
        const payload = splitSyncPayload([
            'version: 8',
            'profiles: []',
            '',
            '# --- TABBY CLOUD SYNC: SSH CONFIG START ---',
            '# SG9zdCBBNjAwMA==',
        ].join('\n'))

        expect(payload.valid).toBe(false)
        expect(payload.sshConfig).toBeNull()
    })

    it('changes the sync fingerprint when only SSH content changes', () => {
        const tabbyConfig = 'version: 8\nprofiles: []\n'
        const first = createSyncPayload(tabbyConfig, 'Host A6000\n    HostName 10.0.0.1\n')
        const second = createSyncPayload(tabbyConfig, 'Host A6000\n    HostName 10.0.0.2\n')

        expect(hashSyncContent(first)).not.toBe(hashSyncContent(second))
    })

    it('excludes local profiles from cloud content but preserves them on pull', () => {
        const localConfig = [
            'version: 8',
            'profiles:',
            '  - id: ssh:a6000',
            '    type: ssh',
            '    name: A6000',
            '  - id: local:wsl-ubuntu',
            '    type: local',
            '    name: WSL / Ubuntu',
        ].join('\n')
        const cloudConfig = stripLocalProfiles(localConfig)
        const cloudObject: any = yaml.load(cloudConfig)
        const restored: any = yaml.load(mergeLocalProfiles(localConfig, cloudConfig))

        expect(cloudObject.profiles.map(profile => profile.id)).toEqual(['ssh:a6000'])
        expect(restored.profiles.map(profile => profile.id)).toEqual(['ssh:a6000', 'local:wsl-ubuntu'])
    })

    it('does not retain local profiles that already exist in cloud', () => {
        const localConfig = 'profiles:\n  - id: local:wsl-ubuntu\n    type: local\n    name: Local WSL\n'
        const cloudConfig = 'profiles:\n  - id: local:wsl-ubuntu\n    type: ssh\n    name: Shared profile\n'
        const merged: any = yaml.load(mergeLocalProfiles(localConfig, cloudConfig))

        expect(merged.profiles).toHaveLength(1)
        expect(merged.profiles[0].type).toBe('ssh')
    })

    it('does not treat machine-local profiles as synced changes', () => {
        const first = createSyncPayload('version: 8\nprofiles:\n  - id: local:wsl-a\n    type: local\n', 'Host A6000\n    HostName 10.0.0.1\n')
        const second = createSyncPayload('version: 8\nprofiles:\n  - id: local:wsl-b\n    type: local\n', 'Host A6000\n    HostName 10.0.0.1\n')

        expect(hashSyncContent(first)).toBe(hashSyncContent(second))
    })

    it('resolves the Windows OpenSSH config under the user profile', () => {
        expect(getOpenSshConfigPath().toLowerCase()).toContain('\\.ssh\\config')
    })

    it('excludes a cloud Host that points at this computer and keeps it for re-upload', () => {
        const cloudConfig = [
            'Host A6000',
            '    HostName 10.0.0.1',
            '',
            'Host Self',
            '    HostName 192.168.1.50',
            '    User jh',
        ].join('\n')
        const identifiers = new Set(['192.168.1.50', 'localhost'])

        const filtered = excludeSelfReferencingSshConfig(cloudConfig, identifiers)

        expect(filtered.config).toContain('Host A6000')
        expect(filtered.config).not.toContain('Host Self')
        expect(filtered.excluded).toHaveLength(1)
        expect(restoreExcludedSshBlocks(filtered.config, filtered.excluded)).toContain('Host Self')
    })

    it('makes SSH key paths portable across operating systems', () => {
        const cloudConfig = normaliseSshConfigPaths([
            'Host A6000',
            '    HostName 10.0.0.1',
            '    IdentityFile C:\\Users\\jym\\.ssh\\id_ed25519',
        ].join('\n'))

        expect(cloudConfig).toContain('IdentityFile ~/.ssh/id_ed25519')
        expect(expandSshConfigPaths(cloudConfig)).toContain('IdentityFile ')
        expect(expandSshConfigPaths(cloudConfig)).not.toContain('~/.ssh/id_ed25519')
    })

    it('makes Tabby SSH profile key paths portable across operating systems', () => {
        const localConfig = [
            'profiles:',
            '  - id: ssh:a6000',
            '    type: ssh',
            '    name: A6000',
            '    options:',
            '      host: 10.0.0.1',
            '      privateKeys:',
            '        - C:\\Users\\jym\\.ssh\\id_ed25519',
        ].join('\n')
        const cloudConfig = normaliseTabbyConfigPaths(localConfig)

        expect(cloudConfig).toContain('~/.ssh/id_ed25519')
        expect(expandTabbyConfigPaths(cloudConfig)).not.toContain('~/.ssh/id_ed25519')
    })
})
