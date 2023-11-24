# Frawg

Want to autofarm those valueless frawgs to get that number higher? Look no further. Is it too late and "Season One" ends soon? Yes.


## Why?

It was fun reverse engineering the frontend and decomposing the entire game into a few network calls; more fun (to me) than automating clicking the buttons in the browser.


## Usage

Unfortunately Node.js is required _shudders_ as `fastfile` is a dependency of `@pcd`'s stuff and that uses Node APIs not yet implemented in Bun. I tried my best to patch them but it refused.

1. Install Node (probably above v18 is fine) and `pnpm`.
2. `pnpm i`.
3. `pnpm frawg`.

Until I add saving your frawgs just dump them to a local file.

3. (alternative) `pnpm frawg | tee -a mah_frawgs.txt`.

You can also `pnpm build` and run the output file `dist/frawg.mjs` directly.


### Authentication

You will be asked for your Zupass email and password (the code is open source here in this repo! Check for yourself!); these are required to download your synced state which contains your `identity` which is finally used to construct valid requests for `frawgs`. Set environment variables `ZUPASS_EMAIL` and `ZUPASS_PASSWORD` to skip being asked every time.

The authentication flow is documented in the source and reversed from the Zupass frontend so feel free to crosscheck. If you already know your `identity` you can patch the source to use it (don't forget to NOT commit that though ;)).


### Dependencies

All dependencies except for `esbuild` are from Zupass' stack.


### Biomes

If you don't have all the biomes you can enter the [Konami code](https://en.wikipedia.org/wiki/Konami_Code) on the frontend to show a form that will add biomes to your account. Biomes all have the same GUID so you can copy them from this packages source for more frawgs.


## Contributions

If you want to submit a PR for whatever reason, format your code with `dprint` first. Don't change the rules in `dprint.jsonc` they are not up for debate.


## TODOs

- [ ] Save your frawgs to your account. You can do this manually by editing your `pcd_collection` in localstorage (which the frontend will then sync) and also by POSTing to their sync endpoint yourself (the plan). I'll do that when I can be bothered.
