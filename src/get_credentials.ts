import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'

import { PCDCrypto } from '@pcd/passport-crypto'
import { type SyncedEncryptedStorageV3, requestDownloadAndDecryptStorage } from '@pcd/passport-interface'
import { type SerializedPCDCollection } from '@pcd/pcd-collection'
import { Identity } from '@semaphore-protocol/identity'

import { spin2win } from './spinner.ts'

const rl = readline.createInterface({ input, output })

// NB: LOGGING-IN TO ZUPASS
// Looks like logging in is a query to get the encryption salt and then to fetch
//   saved (encrypted) state from their sync endpoint.
// The frontend does this extra step (before the encryption salt) where it checks
//   if an email is already registered by sending the email plaintext and a
//   commitment to that email but we don't care about that (could be nice for UX).
//
// 1. Check if email is registered.
// 2. Get encryption salt.
// 3. Construct blob key to download saved state.

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - BOILERPLATE.

export const ZUPASS_MAGIC_HEADERS = {
    host: 'api.zupass.org',
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate, br',
    'content-type': 'application/json',
    referer: 'https://zupass.org/',
    origin: 'https://zupass.org',
    pragma: 'no-cache',
    'cache-control': 'no-cache',
} as const

// `B`ase `Z`upass `A`pi.
export const BZA = 'https://api.zupass.org' as const
export const BZA_FROG = 'https://api.getfrogs.xyz' as const

// `Z`upass URLs.
export const Z_URL = {
    IS_REGISTERED: `${BZA}/account/send-login-email`,
    EMAIL_SALT: `${BZA}/account/salt`,
    FROG: `${BZA_FROG}/frogcrypto/feeds`,
} as const

export const PCD_KEYS = {
    IDENTITY: 'semaphore-identity-pcd',
    FROG: 'eddsa-frog-pcd',
    SIGNATURE: 'semaphore-signature-pcd',
} as const

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - STEP 1. Check if email registered.
//
// Related to: src/api/requestConfirmationEmail.ts

// Ask for email.
const email = process.env.ZUPASS_EMAIL
    ? process.env.ZUPASS_EMAIL
    : await rl.question('Enter zupass email: ')

// Initial `identity` can be anything.
const stub_identity = new Identity()

const rego_query = await spin2win(fetch(Z_URL.IS_REGISTERED, {
    method: 'POST',
    headers: ZUPASS_MAGIC_HEADERS,
    body: JSON.stringify({
        commitment: stub_identity.commitment.toString(),
        email,
        force: false, // Idk what they use this for, default looks like `false`.
    }),
}))

const rego_res_text = await rego_query.text()

if (rego_query.ok === false) {
    // A 403 with the following template string response body indicates the user
    //   exists. This is stupid but it is what it is.
    if (
        rego_query.status === 403 &&
        rego_res_text === `'${email}' already registered`
    ) {
        console.log('Found account with email.')
    } else {
        console.error('Error checking if account with given email exists.')
        console.error(rego_res_text)
        process.exit(1)
    }
}

// Response text contains `OK` if no email is registered.
if (rego_query.ok === true && rego_res_text === 'OK') {
    console.error(`Email '${email}' is not registered, aborting.`)
    // Seperate descriptive error text afterwards.
    console.error(
        "Make an account using their frontend then come back and login here. I am not implementing Zupass' account registration flow here.",
    )
    process.exit(1)
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - STEP 2. Get salt.

const salt_query = new URL(Z_URL.EMAIL_SALT)
salt_query.searchParams.set('email', email)

// TODO: Handle if 200 else error.
const salt_res = await spin2win(fetch(salt_query))
const salt = await salt_res.text()

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - STEP 3. Download synced state and get identity PCD.

// Need the password to create the encrypted blob key.
const password = process.env.ZUPASS_PASSWORD
    ? process.env.ZUPASS_PASSWORD
    : await rl.question('Enter zupass password: ')

rl.close()

const crypto = await PCDCrypto.newInstance()
// XXX: Their SDK prints - [FETCH] logging for this.
const account_storage = await spin2win(
    requestDownloadAndDecryptStorage(BZA, crypto.argon2(password, salt, 32)),
)

if (account_storage.success === false) {
    console.error('Could not download account storage.')
    console.error(account_storage.error)
    process.exit(1)
}

if (account_storage.value?.pcds == null) {
    console.error(
        'Successful account storage download, but PCDs are missing, aborting.',
    )
    console.error(account_storage)
    process.exit(1)
}

process.stdout.write('Retrieved account storage... ')
// Easier to parse ourselves than to use PCDCollection and deserializeAll etc not to mention
//   500 less dependencies (I speculate).
const pcd_collection = JSON.parse(
    (account_storage.value as SyncedEncryptedStorageV3).pcds,
) as SerializedPCDCollection

const frogs = pcd_collection.pcds.filter((pcd) => pcd.type === PCD_KEYS.FROG).length
console.log(`${frogs} frogs found in account.`)

// What we're here for boys.
const identity_pcd = pcd_collection.pcds.find((pcd) =>
    pcd.type === PCD_KEYS.IDENTITY
)

if (identity_pcd == null) {
    console.error('Could not find identity PCD in account storage, aborting.')
    process.exit(1)
}

export const identity_str = JSON.parse(identity_pcd.pcd).identity
