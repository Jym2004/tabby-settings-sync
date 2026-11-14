jest.mock('terminus-core', () => ({}))
jest.mock('../src/utils/Logger', () => ({ __esModule: true, default: jest.fn(() => ({ log: jest.fn() })) }))
jest.mock('../src/services/toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock('../src/utils/cloud-components/WebDav', () => ({ __esModule: true, default: { sync: jest.fn() } }))
jest.mock('../src/utils/cloud-components/AmazonS3', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/FTP', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/gists/gists', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/Dropbox', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/settings-secret', () => ({ __esModule: true, default: {} }))

import * as yaml from 'js-yaml'
import { SettingsHelperClass } from '../src/utils/settings-helper'
import { createSyncPayload } from '../src/utils/sync-payload'
import { requiresLocalSshSetup } from '../src/utils/local-ssh-identity'

describe('applying a download with device-local SSH authentication', () => {
    let helper: any
    let saved: any
    let liveTabby: string
    let liveSsh: string
    let config: any
    const target = 'Host GPU\n    HostName 10.0.0.1\n    User user\n'
    const cloud = createSyncPayload(yaml.dump({ profiles: [{ id: 'ssh:gpu', type: 'ssh', name: 'GPU', options: { host: '10.0.0.1', user: 'user', privateKeys: ['/sender/key'] } }] }), target + '    IdentityFile /sender/key\n')

    beforeEach(() => {
        saved = { adapter: 'webdav', configs: {}, localSshBindings: {} }
        liveTabby = 'profiles: []\n'
        liveSsh = ''
        helper = new SettingsHelperClass()
        jest.spyOn(helper, 'readConfigFile').mockImplementation(() => JSON.parse(JSON.stringify(saved)))
        jest.spyOn(helper, 'readTabbyConfigFile').mockImplementation(() => liveTabby)
        jest.spyOn(helper, 'readSshConfig').mockImplementation(() => liveSsh)
        jest.spyOn(helper, 'isLocalSshFileAvailable').mockImplementation((key: string) => key === '/receiver/key')
        jest.spyOn(helper, 'writeEncryptedConfigAtomically').mockImplementation(async (_file, contents) => { saved = JSON.parse(JSON.stringify(contents)); return true })
        jest.spyOn(helper, 'backupTabbyConfigFile').mockResolvedValue(true)
        jest.spyOn(helper, 'backupSshConfigFile').mockResolvedValue(true)
        jest.spyOn(helper, 'writeExcludedSshBlocks').mockResolvedValue(true)
        jest.spyOn(helper, 'applySshConfigFromSync').mockImplementation(async (content: string) => { liveSsh = content; return true })
        jest.spyOn(helper, 'writeTabbyConfigFile').mockImplementation(async (_platform: any, content: string) => { liveTabby = content; return true })
        jest.spyOn(helper, 'writeFileAsync').mockImplementation(async (_file: string, content: string) => { liveSsh = content; return true })
        config = { writeRaw: jest.fn().mockResolvedValue(undefined) }
    })

    afterEach(() => { jest.restoreAllMocks() })

    it('stages unbound connections without replacing either live file', async () => {
        let caught: any
        try { await helper.applySyncContent(config, { getConfigPath: () => '/unused/config.yaml' }, cloud) }
        catch (error) { caught = error }

        expect(requiresLocalSshSetup(caught)).toBe(true)
        expect(saved.pendingSshBindings).toHaveLength(2)
        expect(saved.pendingSshPayload).toBe(cloud)
        expect(liveTabby).toBe('profiles: []\n')
        expect(liveSsh).toBe('')
        expect(helper.applySshConfigFromSync).not.toHaveBeenCalled()
        expect(config.writeRaw).not.toHaveBeenCalled()
    })

    it('also detects missing identities when the sync comparison would otherwise be a no-op', async () => {
        await expect(helper.checkLocalSshSetup({ getConfigPath: () => '/unused/config.yaml' }, cloud)).rejects.toMatchObject({ code: 'SYNC_LOCAL_SSH_SETUP_REQUIRED' })
        expect(saved.pendingSshBindings).toHaveLength(2)
        expect(config.writeRaw).not.toHaveBeenCalled()
    })

    it('applies both files only after all identities are explicitly bound', async () => {
        const platform = { getConfigPath: () => '/unused/config.yaml' }
        await helper.applySyncContent(config, platform, cloud).catch(() => {})
        for (const request of saved.pendingSshBindings) saved.localSshBindings[request.id] = { auth: 'publicKey', privateKeys: ['/receiver/key'] }

        await helper.applySyncContent(config, platform, cloud)

        expect(liveTabby).toContain('/receiver/key')
        expect(liveSsh).toContain('IdentityFile "/receiver/key"')
        expect(liveTabby + liveSsh).not.toContain('/sender/key')
        expect(saved.pendingSshPayload).toBeUndefined()
        expect(saved.pendingSshBindings).toBeUndefined()
        expect(config.writeRaw).toHaveBeenCalledWith(liveTabby)
    })

    it('keeps a pending download when live settings changed during setup', async () => {
        const platform = { getConfigPath: () => '/unused/config.yaml' }
        await helper.applySyncContent(config, platform, cloud).catch(() => {})
        liveTabby = 'profiles: []\nappearance: {theme: updated}\n'

        await expect(helper.applySyncContent(config, platform, cloud)).rejects.toThrow('Local settings changed')
        expect(liveTabby).toContain('updated')
        expect(helper.applySshConfigFromSync).not.toHaveBeenCalled()
    })

    it('can discard a pending download without changing current connections or bindings', async () => {
        const platform = { getConfigPath: () => '/unused/config.yaml' }
        await helper.applySyncContent(config, platform, cloud).catch(() => {})
        saved.localSshBindings.example = { auth: 'agent' }

        await helper.cancelPendingSshConnections(platform)

        expect(saved.pendingSshPayload).toBeUndefined()
        expect(saved.localSshBindings.example).toEqual({ auth: 'agent' })
        expect(liveTabby).toBe('profiles: []\n')
    })

    it('blocks automatic/manual cloud operations while a setup is waiting', async () => {
        saved.pendingSshBindings = [{ id: 'example', label: 'GPU' }]
        const result = await helper.syncWithCloud(config, {})

        expect(result.requiresLocalSshSetup).toBe(true)
        expect(await helper.syncLocalSettingsToCloud({})).toBe(false)
    })

    it('restores the live files if Tabby cannot load the downloaded config', async () => {
        const platform = { getConfigPath: () => '/unused/config.yaml' }
        await helper.applySyncContent(config, platform, cloud).catch(() => {})
        for (const request of saved.pendingSshBindings) saved.localSshBindings[request.id] = { auth: 'publicKey', privateKeys: ['/receiver/key'] }
        config.writeRaw.mockRejectedValueOnce(new Error('Tabby could not load settings'))

        await expect(helper.applySyncContent(config, platform, cloud)).rejects.toThrow('Tabby could not load settings')

        expect(liveTabby).toBe('profiles: []\n')
        expect(liveSsh).toBe('')
        expect(saved.pendingSshBindings).toHaveLength(2)
    })
})
