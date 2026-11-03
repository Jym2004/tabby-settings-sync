import {
    createSyncPayload,
    getOpenSshConfigPath,
    hashSyncContent,
    splitSyncPayload,
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

    it('resolves the Windows OpenSSH config under the user profile', () => {
        expect(getOpenSshConfigPath().toLowerCase()).toContain('\\.ssh\\config')
    })
})
