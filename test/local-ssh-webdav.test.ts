jest.mock('terminus-core', () => ({}))
jest.mock('webdav', () => ({ AuthType: { Password: 'password' }, createClient: jest.fn() }))
jest.mock('../src/utils/Logger', () => ({ __esModule: true, default: jest.fn(() => ({ log: jest.fn() })) }))
jest.mock('../src/services/toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock('../src/utils/settings-helper', () => ({ __esModule: true, default: { verifyServerConfigIsValid: jest.fn(() => true), readSyncContent: jest.fn() } }))
jest.mock('../src/utils/cloud-components/sync-utils', () => ({
    applyRemoteConfigOnFirstInit: jest.fn(), resolveSyncDirection: jest.fn(), recordLocalBaselineOnFirstInit: jest.fn(), isRemoteMissingError: jest.fn(() => false),
}))

import { createClient } from 'webdav'
import WebDav from '../src/utils/cloud-components/WebDav'
import { applyRemoteConfigOnFirstInit, resolveSyncDirection } from '../src/utils/cloud-components/sync-utils'
import { LocalSshSetupRequired } from '../src/utils/local-ssh-identity'

describe('WebDAV does not overwrite the cloud while local SSH setup is pending', () => {
    let client: any
    beforeEach(() => {
        jest.clearAllMocks()
        client = { stat: jest.fn().mockResolvedValue({}), getFileContents: jest.fn().mockResolvedValue('version: 8'), putFileContents: jest.fn(), moveFile: jest.fn() }
        ;(createClient as jest.Mock).mockReturnValue(client)
        ;(applyRemoteConfigOnFirstInit as jest.Mock).mockRejectedValue(new LocalSshSetupRequired())
        ;(resolveSyncDirection as jest.Mock).mockRejectedValue(new LocalSshSetupRequired())
    })

    it.each([true, false])('returns a pending-setup result for firstInit=%s without a fallback upload', async firstInit => {
        const platform = { showMessageBox: jest.fn().mockResolvedValue({ response: 0 }) } as any
        const result = await WebDav.sync({} as any, platform, { host: 'https://example.test', username: 'user', password: 'example-only', location: '/', port: '' }, firstInit)

        expect(result.requiresLocalSshSetup).toBe(true)
        expect(result.result).toBe(false)
        expect(client.putFileContents).not.toHaveBeenCalled()
        expect(client.moveFile).not.toHaveBeenCalled()
    })
})
