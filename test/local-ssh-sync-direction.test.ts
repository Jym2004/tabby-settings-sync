jest.mock('terminus-core', () => ({}))
jest.mock('../src/utils/Logger', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../src/utils/settings-helper', () => ({ __esModule: true, default: {
    readSyncContent: jest.fn(), getSshConfigFilePath: jest.fn(() => '/unused/.ssh/config'),
    verifyServerConfigIsValid: jest.fn(() => true), doDescryption: jest.fn(value => value),
    readTabbyConfigFile: jest.fn(), checkLocalSshSetup: jest.fn(), getLocalSyncHash: jest.fn(),
} }))
jest.mock('../src/utils/sync-state', () => ({ __esModule: true, default: { read: jest.fn(() => null), record: jest.fn() } }))

import * as fs from 'fs'
import SettingsHelper from '../src/utils/settings-helper'
import { createSyncPayload, normaliseSshConfigPaths, normaliseTabbyConfigPaths } from '../src/utils/sync-payload'
import { resolveSyncDirection } from '../src/utils/cloud-components/sync-utils'
import { LocalSshSetupRequired } from '../src/utils/local-ssh-identity'

describe('syncing shared connections without device identities', () => {
    const localTabby = 'profiles:\n - id: ssh:gpu\n   type: ssh\n   name: GPU\n   options:\n    host: server\n    user: user\n    privateKeys: [/local/key]\n    auth: publicKey\n'
    const ssh = 'Host GPU\n HostName server\n User user\n IdentityFile /local/key\n'
    let options: any

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(fs.promises, 'stat').mockResolvedValue({ mtime: new Date(), mtimeMs: Date.now() } as any)
        ;(SettingsHelper.readSyncContent as jest.Mock).mockReturnValue(createSyncPayload(normaliseTabbyConfigPaths(localTabby), normaliseSshConfigPaths(ssh)))
        ;(SettingsHelper.readTabbyConfigFile as jest.Mock).mockReturnValue(localTabby)
        ;(SettingsHelper.checkLocalSshSetup as jest.Mock).mockResolvedValue(undefined)
        options = { config: {}, platform: { getConfigPath: () => '/unused/config.yaml' }, logger: { log: jest.fn() }, adapterId: 'webdav', providerLabel: 'WebDAV', remoteUpdatedAt: null, pushToCloud: jest.fn().mockResolvedValue(true) }
    })
    afterEach(() => { jest.restoreAllMocks() })

    it('cleans legacy cloud identity fields when shared connection settings already agree', async () => {
        options.remoteContent = createSyncPayload(localTabby.replace('/local/key', '/sender/key'), ssh.replace('/local/key', '/sender/key'))

        const result = await resolveSyncDirection(options)

        expect(SettingsHelper.checkLocalSshSetup).toHaveBeenCalled()
        expect(options.pushToCloud).toHaveBeenCalledTimes(1)
        expect(result.action).toBe('push')
    })

    it('does not upload again when the cloud already contains only shared settings', async () => {
        options.remoteContent = SettingsHelper.readSyncContent(options.platform)

        const result = await resolveSyncDirection(options)

        expect(result.action).toBe('noop')
        expect(options.pushToCloud).not.toHaveBeenCalled()
    })

    it('blocks a no-op or cleanup upload if the local private key is missing', async () => {
        options.remoteContent = createSyncPayload(localTabby, ssh)
        ;(SettingsHelper.checkLocalSshSetup as jest.Mock).mockRejectedValue(new LocalSshSetupRequired())

        await expect(resolveSyncDirection(options)).rejects.toMatchObject({ code: 'SYNC_LOCAL_SSH_SETUP_REQUIRED' })
        expect(options.pushToCloud).not.toHaveBeenCalled()
    })
})
