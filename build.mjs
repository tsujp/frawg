/// <reference types="@types/node" />

import { fork } from 'child_process'
import { context } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

// No __dirname in ESM scope, make it ourselves.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Script arguments.
const args = process.argv.slice(2)

// REALLY REALLY basic argument parsing.
const watchBuild = args.at(0) === '--watch'

let buildNotify = {
    name: 'notify_the_boys',
    setup (build) {
        build.onEnd(async (result) => {
            console.log(`build complete, ${result.errors.length} errors`)

            const chld = fork(path.join(__dirname, 'dist', 'frawgs.mjs'))

            await new Promise((resolve) => {
                chld.on('close', resolve)
            })

            if (watchBuild === false) {
                process.exit(0)
            }
        })
    },
}

async function watch () {
    let ctx = await context({
        bundle: true,
        packages: 'external', // XXX: Need this else +500 packages for satanic Node.js polyfills.
        format: 'esm',
        target: 'esnext',
        platform: 'node',
        entryPoints: [path.join(__dirname, 'src', 'frawgs.ts')],
        outdir: path.join(__dirname, 'dist'),
        outExtension: { '.js': '.mjs' },
        plugins: [buildNotify],
    })

    await ctx.watch()
    console.log('Watching for changes...')
}

watch()
