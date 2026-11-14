import * as yaml from 'js-yaml'
import { DeviceSshIdentities, deviceBindingDirectives, mergeOpenSshIdentities, mergeTabbySshIdentities, stripOpenSshIdentities, stripTabbySshIdentities } from '../src/utils/local-ssh-identity'
import { createSyncPayload, hashSyncContent } from '../src/utils/sync-payload'

function profile (key: string, extra = {}): string {
    return yaml.dump({ profiles: [{ id: 'ssh:gpu', type: 'ssh', name: 'GPU', options: { host: '10.0.0.1', user: 'user', privateKeys: [key], auth: 'publicKey', ...extra } }] })
}
const target = 'Host GPU\n    HostName 10.0.0.1\n    User user\n'

describe('device-local SSH identities', () => {
    let state: DeviceSshIdentities
    beforeEach(() => { state = { bindings: {}, pending: [] } })

    it('preserves the receiver key when downloading a legacy cloud profile', () => {
        const result: any = yaml.load(mergeTabbySshIdentities(profile('/receiver/key'), profile('/sender/key'), state, key => key === '/receiver/key'))
        expect(result.profiles[0].options.privateKeys).toEqual(['/receiver/key'])
        expect(state.pending).toEqual([])
        expect(JSON.stringify(state)).not.toContain('/sender/key')
    })

    it('does not accept a source path even if a same-named file exists on a new device', () => {
        const result = mergeTabbySshIdentities('profiles: []', profile('/sender/key'), state, () => true)
        expect(state.pending).toHaveLength(1)
        expect(result).not.toContain('/sender/key')
        expect(result).not.toContain('privateKeys')
    })

    it('requires an explicit choice instead of falling back to every discoverable key', () => {
        mergeTabbySshIdentities(profile('/missing/key'), profile('/sender/key'), state, () => false)
        expect(state.pending).toHaveLength(1)
    })

    it('supports choosing an agent or password on the receiving device', () => {
        for (const auth of ['agent', 'password', 'keyboardInteractive']) {
            state = { bindings: {}, pending: [] }
            const local = profile('/unused/key', { auth, privateKeys: [] })
            const result: any = yaml.load(mergeTabbySshIdentities(local, profile('/sender/key'), state, () => false))
            expect(result.profiles[0].options.auth).toBe(auth)
            expect(state.pending).toEqual([])
        }
    })

    it('never reuses an identity after a host, user or jump target changes', () => {
        for (const extra of [{ host: 'other' }, { user: 'other' }, { jumpHost: 'ssh:other' }]) {
            state = { bindings: {}, pending: [] }
            mergeTabbySshIdentities(profile('/local/key'), profile('/cloud/key', extra), state, () => true)
            expect(state.pending).toHaveLength(1)
        }
    })

    it('remembers an explicit local binding for the next application', () => {
        const cloud = profile('/sender/key')
        mergeTabbySshIdentities('profiles: []', cloud, state, () => false)
        state.bindings[state.pending[0].id] = { auth: 'publicKey', privateKeys: ['/receiver/key'] }
        state.pending = []
        const result: any = yaml.load(mergeTabbySshIdentities('profiles: []', cloud, state, key => key === '/receiver/key'))
        expect(state.pending).toEqual([])
        expect(result.profiles[0].options.privateKeys).toEqual(['/receiver/key'])
    })

    it('strips profile/default authentication fields and plaintext passwords from uploads', () => {
        const config: any = yaml.load(profile('/local/key', { password: 'example-only' }))
        config.profileDefaults = { ssh: { privateKeys: ['/default/key'], auth: 'publicKey' } }
        const cloud = stripTabbySshIdentities(yaml.dump(config))
        for (const value of ['privateKeys', 'privateKey:', 'auth:', 'password:', '/local/key', '/default/key', 'example-only']) expect(cloud).not.toContain(value)
    })

    it('preserves local SSH identity directives and discards cloud identities', () => {
        const local = target + '    IdentityFile "/receiver/key"\n    IdentitiesOnly yes\n'
        const cloud = target + '    IdentityFile "/sender/key"\n    IdentityAgent /sender/agent\n'
        const result = mergeOpenSshIdentities(local, cloud, state, key => key === '/receiver/key')
        expect(state.pending).toEqual([])
        expect(result).toContain('IdentityFile "/receiver/key"')
        expect(result).not.toContain('/sender/')
    })

    it('keeps multiple identities, certificate and agent settings scoped to the existing host', () => {
        const local = target + '    IdentityFile /a\n    IdentityFile /b\n    CertificateFile /cert\n    IdentityAgent /agent\n'
        const result = mergeOpenSshIdentities(local, target, state, () => true)
        for (const value of ['/a', '/b', '/cert', '/agent']) expect(result).toContain(value)
        expect(state.pending).toEqual([])
    })

    it('preserves local wildcard identities without granting them silently to new hosts', () => {
        const local = target + 'Host *.internal\n    IdentityFile /wildcard\nHost *\n    IdentityAgent /local-agent\n'
        const result = mergeOpenSshIdentities(local, target + 'Host NEW\n    HostName 10.0.0.2\n', state, () => true)
        expect(result).toContain('Host *.internal\n    IdentityFile /wildcard')
        expect(result).toContain('Host *\n    IdentityAgent /local-agent')
        expect(state.pending.map(item => item.label)).toEqual(['OpenSSH new'])
    })

    it('requires setup when an existing OpenSSH key file is missing', () => {
        mergeOpenSshIdentities(target + '    IdentityFile /missing\n', target, state, () => false)
        expect(state.pending).toHaveLength(1)
    })

    it('uses explicitly selected local key directives for new OpenSSH hosts', () => {
        mergeOpenSshIdentities('', target, state, () => true)
        state.bindings[state.pending[0].id] = deviceBindingDirectives({ auth: 'publicKey', privateKeys: ['/receiver/key'] })
        state.pending = []
        const result = mergeOpenSshIdentities('', target, state, () => true)
        expect(result).toContain('IdentityFile "/receiver/key"')
        expect(result).toContain('IdentitiesOnly yes')
        expect(state.pending).toEqual([])
    })

    it('does not treat different local identity paths as shared content changes', () => {
        const a = createSyncPayload(profile('/device-a/key'), target + '    IdentityFile /device-a/key\n')
        const b = createSyncPayload(profile('/device-b/key'), target + '    IdentityFile /device-b/key\n')
        expect(hashSyncContent(a)).toBe(hashSyncContent(b))
        expect(stripOpenSshIdentities(target + '    IdentityFile /key\n')).not.toContain('IdentityFile')
    })

    it('removes identities written with OpenSSH equals syntax', () => {
        const result = stripOpenSshIdentities('Host GPU\n HostName=10.0.0.1\n IdentityFile=/local/key\n IdentityAgent = /local/agent\n')
        expect(result).toContain('HostName=10.0.0.1')
        expect(result).not.toContain('/local/')
    })

    it('does not upload local identity-only wildcard, match, and Include rules', () => {
        const result = stripOpenSshIdentities(target + 'Host *\n IdentityFile /local/key\nMatch user user\n IdentityAgent /agent\n Include ~/.ssh/local-auth\n')
        expect(result).toBe(target)
    })

    it('retains local Include rules without copying a cloud Include', () => {
        const local = 'Include ~/.ssh/device\n' + target
        const cloud = 'Include /sender/config\n' + target
        const result = mergeOpenSshIdentities(local, cloud, state, () => true)
        expect(result).toContain('Include ~/.ssh/device')
        expect(result).not.toContain('/sender/config')
        expect(state.pending).toEqual([])
    })

    it('rejects a .pub file as a Tabby private-key binding', () => {
        mergeTabbySshIdentities(profile('/receiver/key.pub'), profile('/sender/key'), state, () => true)
        expect(state.pending).toHaveLength(1)
    })

    it('does not leave empty authentication defaults in the cloud copy', () => {
        expect(stripTabbySshIdentities('profiles: []\nprofileDefaults:\n ssh:\n  privateKeys: [/local/key]\n')).toBe('profiles: []\n')
    })

    it('keeps SSH identities inherited from this device\'s group defaults', () => {
        const local: any = yaml.load(profile('/unused'))
        delete local.profiles[0].options.privateKeys
        local.profiles[0].group = 'group:gpu'
        local.groups = [{ id: 'group:gpu', name: 'GPU', defaults: { ssh: { options: { privateKeys: ['/group/key'], auth: 'publicKey' } } } }]
        const cloud = stripTabbySshIdentities(yaml.dump(local))
        expect(cloud).not.toContain('/group/key')
        const result: any = yaml.load(mergeTabbySshIdentities(yaml.dump(local), cloud, state, key => key === '/group/key'))
        expect(result.profiles[0].options.privateKeys).toEqual(['/group/key'])
        expect(state.pending).toEqual([])
    })
})
