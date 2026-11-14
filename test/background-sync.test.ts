import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'
import * as vm from 'vm'

// Load the actual background module without bootstrapping Tabby's Angular UI.
function loadBackgroundModule (settingsHelper: any, syncLock: any): any {
    const source = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8')
    const compiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2016, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
    }).outputText
    const exports = {}
    const logger = { log: jest.fn() }
    const runtime = {
        exports,
        require: (id: string) => {
            if (id === '@angular/core') return { NgModule: () => (target: any) => target }
            if (id === './utils/settings-helper') return { default: settingsHelper }
            if (id === './utils/sync-lock') return { default: syncLock }
            if (id === './utils/Logger') return { default: class { log = logger.log } }
            if (id === './data/setting-items') return { default: { defaultSyncInterval: 20 } }
            return {}
        },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
    }
    vm.runInNewContext(compiled, runtime)
    return (exports as any).default
}

describe('background sync preference', () => {
    let helper: any
    let background: any

    beforeEach(() => {
        helper = {
            readConfigFile: jest.fn(() => ({ enabled: false })),
            syncLocalSettingsToCloud: jest.fn().mockResolvedValue(true),
            syncWithCloud: jest.fn(),
            getLocalSshConfigHash: jest.fn(),
        }
        const Module = loadBackgroundModule(helper, { isLocked: false })
        background = Object.create(Module.prototype)
        background.platform = {}
        background.configService = { store: {} }
        background.isLocalConfigAlreadySynced = jest.fn(() => false)
        background.showLoaderIndicator = jest.fn()
        background.hideLoaderIndicator = jest.fn()
        background.subscribeToAutoSyncEvent = jest.fn()
    })

    it('does not upload a pending configuration change after automatic sync is disabled', async () => {
        await background.pushLocalConfigChange()

        expect(helper.syncLocalSettingsToCloud).not.toHaveBeenCalled()
        expect(background.isLocalConfigAlreadySynced).not.toHaveBeenCalled()
    })

    it('continues uploading configuration changes when automatic sync is enabled', async () => {
        helper.readConfigFile.mockReturnValue({ enabled: true })

        await background.pushLocalConfigChange()

        expect(helper.syncLocalSettingsToCloud).toHaveBeenCalledWith(background.platform)
    })

    it('skips cloud polling and SSH-change uploads when automatic sync is disabled', async () => {
        await background.syncCloudSettings()
        background.detectSshConfigChange()

        expect(helper.syncWithCloud).not.toHaveBeenCalled()
        expect(helper.syncLocalSettingsToCloud).not.toHaveBeenCalled()
        expect(helper.getLocalSshConfigHash).not.toHaveBeenCalled()
        expect(background.subscribeToAutoSyncEvent).toHaveBeenCalledTimes(1)
    })
})
