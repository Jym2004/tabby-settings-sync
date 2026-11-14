jest.mock('terminus-core', () => ({ ToolbarButtonProvider: class {} }))
jest.mock('../src/utils/Logger', () => ({ __esModule: true, default: jest.fn(() => ({ log: jest.fn() })) }))
jest.mock('../src/services/toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock('../src/utils/cloud-components/WebDav', () => ({ __esModule: true, default: { sync: jest.fn() } }))
jest.mock('../src/utils/cloud-components/AmazonS3', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/FTP', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/gists/gists', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/cloud-components/Dropbox', () => ({ __esModule: true, default: {} }))
jest.mock('../src/utils/settings-secret', () => ({ __esModule: true, default: {} }))

import SettingsHelper from '../src/utils/settings-helper'
import WebDav from '../src/utils/cloud-components/WebDav'
import SyncLock from '../src/utils/sync-lock'
import PluginToast from '../src/services/toast'
import { CloudSyncActions } from '../src/providers/cloud-sync-actions'
import { CloudSyncToolbarProvider } from '../src/providers/cloud-sync-toolbar.provider'

describe('manual sync with automatic sync disabled', () => {
    const platform = {} as any
    const config = { store: {} } as any
    let actions: CloudSyncActions

    beforeEach(() => {
        jest.clearAllMocks()
        SyncLock.release()
        config.store = {}
        jest.spyOn(SettingsHelper, 'readConfigFile').mockReturnValue({ adapter: 'webdav', enabled: false, configs: {} })
        ;(WebDav.sync as jest.Mock).mockResolvedValue({ result: true, message: '' })
        actions = new CloudSyncActions({} as any, config, platform)
    })

    afterEach(() => {
        SyncLock.release()
        jest.restoreAllMocks()
    })

    it('runs a manual sync without changing the automatic-sync preference', async () => {
        await actions.syncNow()

        expect(WebDav.sync).toHaveBeenCalledWith(config, platform, {}, false, null)
        expect(SettingsHelper.readConfigFile(platform).enabled).toBe(false)
        expect(PluginToast.success).toHaveBeenCalled()
        expect(PluginToast.error).not.toHaveBeenCalled()
    })

    it('keeps manual toolbar actions available when automatic sync is off', async () => {
        const toolbar = new CloudSyncToolbarProvider(actions).provide()[0]
        const openSettings = jest.spyOn(actions, 'openSettings').mockImplementation(() => {})
        const menu = await toolbar.submenu()

        expect(menu.map(item => item.title)).toEqual([
            'Sync settings now',
            'Upload settings from this device',
            'Download cloud settings to this device',
            'Open Cloud Sync Settings',
        ])
        await toolbar.click()
        expect(WebDav.sync).toHaveBeenCalledTimes(1)
        expect(openSettings).not.toHaveBeenCalled()
    })

    it('still refuses overlapping manual syncs', async () => {
        SyncLock.acquire('test-background-sync')

        await actions.syncNow()
        await actions.uploadLocalSettings()

        expect(WebDav.sync).not.toHaveBeenCalled()
        expect(PluginToast.warning).toHaveBeenCalledTimes(2)
        expect(SyncLock.currentOwner).toBe('test-background-sync')
    })

    it('releases the lock and reports a provider failure', async () => {
        ;(WebDav.sync as jest.Mock).mockRejectedValue(new Error('Network unavailable'))

        await actions.syncNow()

        expect(SyncLock.isLocked).toBe(false)
        expect(PluginToast.success).not.toHaveBeenCalled()
        expect(PluginToast.error).toHaveBeenCalledWith('Error: Network unavailable')
    })

    it('requires a saved provider for manual sync', async () => {
        jest.spyOn(SettingsHelper, 'readConfigFile').mockReturnValue(null)

        await actions.syncNow()

        expect(WebDav.sync).not.toHaveBeenCalled()
        expect(PluginToast.error).toHaveBeenCalledWith('Save your configuration first.')
    })

    it('still prevents a conflict with native Tabby Sync', async () => {
        config.store.configSync = { host: 'sync.example.test', token: 'test-token', configID: 'test-config' }

        await actions.syncNow()

        expect(WebDav.sync).not.toHaveBeenCalled()
        expect(PluginToast.warning).toHaveBeenCalled()
    })

    it.each([false, true])('reports force-upload result %s accurately', async success => {
        jest.spyOn(SettingsHelper, 'syncLocalSettingsToCloud').mockResolvedValue(success)

        await actions.uploadLocalSettings()

        expect(SettingsHelper.syncLocalSettingsToCloud).toHaveBeenCalledWith(platform)
        expect(PluginToast.success).toHaveBeenCalledTimes(success ? 1 : 0)
        expect(PluginToast.error).toHaveBeenCalledTimes(success ? 0 : 1)
    })

    it('reports an unexpected upload exception without claiming success', async () => {
        jest.spyOn(SettingsHelper, 'syncLocalSettingsToCloud').mockRejectedValue(new Error('Upload failed'))

        await actions.uploadLocalSettings()

        expect(PluginToast.success).not.toHaveBeenCalled()
        expect(PluginToast.error).toHaveBeenCalledWith('Upload failed')
    })
})
