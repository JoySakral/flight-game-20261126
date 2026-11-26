# flight-game-20261126

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/JoySakral/flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/JoySakral/flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Sky Courier — Valley Run: an original 3D-ish chase-view flight game. Take off from Meadowfield strip, thread glowing rings over a living valley, mind your fuel, and land her home.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser and press 1, 2 or 3 to fly a mission.

## How to fly

- **W / S** — throttle up / down (it holds where you leave it)
- **↑ / ↓** — pitch (up is pull back, down is push forward)
- **← / →** — roll and bank into turns
- **Mouse drag** — steer
- **G** — landing gear up / down, **B** — brakes, **P** — pause, **R** — restart

## Missions

1. **Ring Run** — 8 rings over the valley in 3:00, land back at Meadowfield.
2. **Island Hop** — rings across the lake to the far strip in 4:00, land there.
3. **Canyon Courier** — low rings through the canyon on tight fuel in 3:30.

Score rings for speed, earn a landing bonus for bringing Daisy home with time to spare. Stall below 52 kt, hit the terrain, or run dry and she goes down — damage decides whether it is a hard landing or a crash.

## Tech

Pure static files under `game/` — no build step, no network requests, no libraries. A small software 3D projector draws the valley, runway, rings and clouds on canvas; the plane, HUD instruments and all sounds (WebAudio engine hum, wind, ring chimes) are original code. `main.ts` hands the game in with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tvfbjxfd&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
