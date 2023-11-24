import { CredentialManager, createCredentialCache } from '@pcd/passport-interface'
import { SemaphoreSignaturePCDPackage } from '@pcd/semaphore-signature-pcd'
import { Identity } from '@semaphore-protocol/identity'
import { PCD_KEYS, ZUPASS_MAGIC_HEADERS, Z_URL, identity_str } from './get_credentials'
import { delay } from './spinner'

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - GET CREDENTIALS FIRST.

// Identity is private.
const identity = new Identity(identity_str)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - CONFIG.

// Generic for all.
const Feeds = {
    Swamp: '7d27baf6-c568-4069-92c7-fc5daae854f6',
    'Celestial Pond': '0a9a51b8-8598-4e35-b1c5-1564f0cdbea5',
    'The Writhing Void': '965df833-c85f-4ea4-8998-ae7c429c5803',
    Desert: 'c097db01-ff2a-46d8-82cb-a3873a4db3f0',
    Jungle: '8d1f0008-c63b-4cdf-9c23-d86ecf0f5729',
    'The Capital': '47761bc0-0509-4f36-a2c6-4f9f27b34a30',
} as const

// Sane date formats please (lol months before days).
const SANE_DATETIME_FORMAT = {
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
    year: '2-digit',
    month: 'short',
    timeZoneName: 'shortOffset',
} as const

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - ZUPASS BACKENDS AND BOILERPLATE.

// WASM bundles.
const zkeyFilePath: string =
    './node_modules/@pcd/semaphore-signature-pcd/artifacts/16.zkey'
const wasmFilePath: string =
    './node_modules/@pcd/semaphore-signature-pcd/artifacts/16.wasm'

// Init that shizzle.
await SemaphoreSignaturePCDPackage.init!({
    zkeyFilePath,
    wasmFilePath,
})

// To create that juicy `semaphore-signature-pcd` to claim deh frawgs.
const credentialCache = createCredentialCache()

const credentialManager = new CredentialManager(
    identity,
    // @ts-ignore
    [SemaphoreSignaturePCDPackage],
    credentialCache,
)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - FRAWGS.

console.log('\n- - - - TIME TO GET SOME FRAWGS - - - -\n')

async function getFrog (feed: string, name: string) {
    const body = {
        feedId: feed,
        pcd: await credentialManager.requestCredential({
            // Lol it needs the misspelt version.
            signatureType: 'sempahore-signature-pcd',
            // signatureType: PCD_KEYS.SIGNATURE,
            pcdType: undefined,
        }),
    }

    const gimme_frawg = await fetch(Z_URL.FROG, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: ZUPASS_MAGIC_HEADERS,
    })

    const res_payload = await gimme_frawg.text()

    if (gimme_frawg.ok) {
        console.log(`Searched ${name} and FOUND A FRAWG!!`)
        // TODO: Automatically add it to your storage.
        console.log(res_payload)

        return 1000 // Refetch ASAP to get cooldown time.
    }

    if (
        gimme_frawg.ok === false && res_payload.includes('Next fetch available at')
    ) {
        const now = Date.now() // This can fail, fucking JS.
        const cd_epoch_ms = parseInt(
            res_payload.split(' ').at(-1) ?? (Date.now() + 60000).toString(),
        )

        const cd_pretty = new Intl.DateTimeFormat('en-AU', SANE_DATETIME_FORMAT)
            .format(cd_epoch_ms)

        const cd_ms = cd_epoch_ms - now

        console.log(
            `${name} on cooldown until ${cd_pretty} (in ${cd_ms} ms) (${cd_epoch_ms})`,
        )

        return cd_ms // Try again after cooldown time.
    }

    console.error(`Error searching ${name}!!`)
    console.error(res_payload)

    return 60000 // 1 minute cooldown on error.
}

// Cbf doing this 'properly', this works and doesn't spam the server.
async function cooldown (id: string, name: string) {
    let cooldown_time = 10000 // 10s
    while (true) {
        cooldown_time = await getFrog(id, name)
        console.log(`${name} cooling down for ${Math.ceil(cooldown_time / 1000)}s`)
        await delay(cooldown_time)
    }
}

Object.entries(Feeds).forEach(async ([b_name, b_id]) => {
    cooldown(b_id, b_name)
})
