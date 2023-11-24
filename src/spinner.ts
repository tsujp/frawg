const FRAMES = ['/', '-', '\\', '|'] as const

const FRAME_COUNT = FRAMES.length

// Yes, yes your $TERM may not support these. Feel free to add ncurses as a
//   dependency (that's a joke by the way... don't; it's too much for something this shit).
const DELETE_PREV_CHAR = '\x1b[1D'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'

export function delay (t: number) {
    return new Promise((res) => setTimeout(res, t))
}

export async function spin2win<T> (prom: Promise<T>): Promise<T> {
    let frame = 0
    let spin = true
    process.stdout.write(HIDE_CURSOR)

    return new Promise(async (resolve) => {
        while (spin) {
            prom.then((res) => {
                process.stdout.write(DELETE_PREV_CHAR) // Final spinner frame.
                process.stdout.write(SHOW_CURSOR)
                spin = false
                resolve(res)
            })

            frame = (frame + 1) % FRAME_COUNT
            process.stdout.write(DELETE_PREV_CHAR)
            process.stdout.write(FRAMES[frame])
            await delay(100)
        }
    })
}
