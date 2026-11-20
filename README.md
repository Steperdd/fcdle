# FCdle

A daily Mario Kart Wii game. Every day you roll one legal friend code (usually random, about 1 in 4 a real racer from the Retro Rewind (RWFC) VR leaderboard) and score it for rare patterns: repeated digits, meme numbers, palindromes, and facts about the racer such as leaderboard rank and VR. Collect badges, build a streak, and send your result to friends to see who rolled best.

Unofficial fan project inspired by [RNGdle](https://www.rngdle.com). Not affiliated with RNGdle, Retro Rewind or Nintendo.

## How it works

- **Daily roll:** your player ID and the UTC date pick one of the ~142,000 racers in `fc/`. Reloading gives the same racer; tomorrow gives a new one.
- **Badges and EP:** 113 badges, each worth `round(100 / odds)` EP (capped at 100 million). Only the highest level in a badge family scores. Odds come from scoring 4 million simulated friend codes (`sim.js`), and racer badges (rank, VR) use the real racer list.
- **Code rarity:** a code's EP total is compared with the simulated codes to give a tier from Common up to Mythic.
- **Extras:** streaks, achievements, a stats page, a Compare tab for pasted results, backup and restore with a save code, and skip, sound and celebration effects on the roll.

Everything runs in the browser. Progress is saved in `localStorage`. There is no server.

## Layout

| Path | What it is |
| --- | --- |
| `template.html` | The whole app (HTML, CSS, JS) with placeholders for the data below |
| `core.js` | Badge catalogue, scoring and friend-code checksum logic (also used by the build) |
| `sim.js` | Monte Carlo odds simulation. Writes `probs.json` |
| `build.js` | Injects `core.js`, `probs.json` and `pool.json` into the template and writes `index.html` |
| `build_pool.py` | Builds `fc/NN.json` shards and `pool.json` from a leaderboard export |
| `fc/` | Racer list split into 55 shards by the first two digits of the friend code: `[rank, friendCode, name, vr]` |
| `miis_fc/` | Mii pictures for 200 top racers, named by friend code |
| `tools/` | Audit scripts: check every badge can be earned by at least one racer |
| `tests/` | Playwright browser tests |

## Build

Needs Node 18+.

```
node sim.js     # about 25 seconds, writes probs.json (and runs core.js self-checks)
node build.js   # writes index.html
```

Whenever you add, remove or change a badge in `core.js`, run both, then run the audit:

```
node tools/audit.js    # lists any badge no racer can earn
node tools/audit2.js   # lists any badge that is always covered by a higher level
```

## Run locally

Serve the folder over HTTP (the page fetches `fc/*.json`, so `file://` won't work):

```
python3 -m http.server 8000
```

Then open http://localhost:8000/index.html.

## Tests

Needs Python 3, `pip install playwright` and Chrome. The tests serve the repo themselves and stub the Claude sign-in runtime.

```
python3 tests/test_racer.py
python3 tests/test_fx.py
```

## Website

The built site is static: `index.html`, `fc/` and `miis_fc/` (plus `404.html`, `og.png` and `.nojekyll`). It is served from the repo root with GitHub Pages at https://steperdd.github.io/fcdle/ (Settings, Pages, Deploy from a branch, `main`, `/ (root)`).

The page was first built for Claude's artifact runtime, where a signed-in viewer can post to a shared database. On a normal website that part is simply absent and the rest of the game works. To host it somewhere else, change `SHARE_URL` and the address in the `<head>` of `template.html`, then run `node build.js`.

`og.png` is the link preview image. Regenerate it from `tools/og.html` (a 1200x630 screenshot).

## Regenerating the racer list

`build_pool.py` expects a JSON export of the RWFC VR leaderboard shaped like `{"rows": [[rank, "0000-0000-0000", "name", vr], ...], "susp": [...], "totalCount": n}`, excluding players the leaderboard marks as suspicious:

```
python3 build_pool.py leaderboard.json
node sim.js && node build.js
```

The racer list in this repo is a snapshot from November 20, 2026.

## Data and privacy

Racer names, friend codes and Mii pictures come from the public RWFC VR leaderboard. They are already public there, but this repo republishes them, so consider that before making the repo public.

The reserved name check on the Today tab is a client-side deterrent only and can be bypassed by anyone reading the source.
