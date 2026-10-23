# Nox Party

A Windows desktop party collection for a mantelpiece or wall, with a separate native projector window and up to four phone controllers. Chunky fighters wobble, stumble, punch, block, fly-kick, climb mapped objects and float down with umbrellas. Brawl and parkour use three lives. Seven modes include Brawl, Parkour, Hot Potato, Nox Kart, Brick Breakers, Doubles Pong and Shelfball.

## Start

Double-click **Start-Nox-Party.cmd**. The old Start-Wallio.cmd, Start-Shelf-Life.cmd and Start-Mantel-Melee.cmd launchers also open the renamed app. For a fresh checkout: install Node.js 24 or newer, run `npm ci`, then `npm start`. The Windows launcher installs missing dependencies on its first run. Electron runs the native control desk and owns its local game server. Closing the control desk closes the projector and stops that server. Node.js is needed for dependency installation. All runtime artwork is included in the repository.

The app uses port 3000 when available, otherwise a free port. Always scan the QR code in the current desktop window. Connect all phones to the same private Wi-Fi as the PC. If Windows asks, allow the app on private networks. Guest Wi-Fi isolation can prevent phone connections.

Phones can join during a match if there is a spare place. Joining a practice match takes over a bot, keeping its current lives, score, lap progress and owned objects. Four human players is the limit. A new empty slot receives three lives and brief spawn protection. Reconnecting or refreshing the same phone browser restores its fighter. Opening the same controller in a second tab transfers control once; the old tab stays disconnected until you explicitly rejoin. A finished round remains finished until the host chooses the next game or returns to the lobby; players may still connect ready for the next round.

## Separate projector output

Use Windows extended-display mode (**Windows + P → Extend**). Under **Projector output → Display**, **Automatic** selects a screen away from the control desk, including a projector connected after the app starts. Choose a specific display to override this; the app remembers that selection. Changing Display moves an already-open output immediately. The status line names the active output screen. If only one screen is detected, the desk explains that a separate display is needed; Automatic then uses the main screen for preview.

Choose **Open projector**. The app positions the window on the selected monitor before entering fullscreen, including displays with different scaling. The new window is borderless and fullscreen, with a pure black background and hidden cursor. It contains only fighters, their names/health/lives, effects, and countdown/winner text. There are no browser bars, dashboard panels or calibration grids during play. Objects explicitly marked Show on projector are drawn as virtual surfaces. Maze, track, brick and paddle modes draw their own playfields on black.

**Blackout** makes the entire output black without stopping the match. **Resume projection** restores it. **Close output** closes only the projector. Esc in the projector window closes it and returns focus to the desk; B toggles blackout. If the chosen display is unplugged, the output closes. Open it again after reconnecting. The game keeps running when the desktop window loses focus.

## Edit the arena from the main screen

Return to the lobby and select **Edit arena**. The desktop workspace follows Nox Projection Studio's canvas-first layout: objects and saved layouts on the left, the canvas in the centre, and a contextual inspector and projector controls on the right. Changes mirror live to the projector; there is no need to edit inside the fullscreen window.

- **Platform:** a standable line, including sloped surfaces. Fighters can jump through the underside.
- **Solid object:** a rectangular obstacle with collidable sides, underside and a standable top.
- **Wall:** a tall solid rectangle. Its top can be climbed if reachable.
- Drag endpoints/corner handles to resize. Drag a line or the inside of a solid to move it.
- Select objects using the dropdown or by clicking their handles. Fine-tune coordinates with the numeric fields. The editor uses a fixed 1280 × 720 coordinate system stretched to the selected output display.
- Keep the first surface as the main mantel. It sets initial spawn positions. Fighters spawn in clear spaces or on top if the mantel is occupied.
- **Save & finish** saves to `arena.json` and removes the projector guides. **Discard** cancels edits. **Reset layout** changes the draft; save to apply it.
- C opens/saves the editor; A adds a platform; Delete removes the selected object. Main mantel cannot be deleted.

The toolbar changes with the game: platforms/solids/walls for physical arenas, control points for Nox Kart, and rectangle/ellipse/triangle shapes for Brick Breakers. The object's eye button controls whether it appears on the projector. Select the **Library** tab to save or load named layouts, and **Connect phones** to open the room code and QR panel.

- Undo/redo: Ctrl+Z / Ctrl+Shift+Z. A complete drag is one undo step.
- Duplicate: Ctrl+D. Nudge: arrow keys, or Shift+arrow for ten pixels.
- Select: V. Pan: H, middle mouse, or hold Space while dragging.
- Zoom: Ctrl+scroll at the pointer, or the +/− controls. Fit: 0. Focus selected object: F.
- Grid: G. Ten-pixel snapping: S. Save edits: Ctrl+S.

Zoom and pan affect only the editor view. Saved coordinates and projector alignment remain fixed. Side panels scroll independently; the canvas and match controls stay in the window at desktop sizes down to 900 × 650.

Saved geometry from the earlier version is preserved. Existing object-top lines remain platforms until you replace them with solid objects. Align guides with the real room after projector position, resolution or zoom changes. This is manual 2D mapping, not automatic 3D reconstruction or perspective warping.

## Phone controls

- **Left/right:** walk and steer in the air.
- **Jump / climb:** tap to jump. Move toward a reachable ledge while airborne to grab it; release and tap jump again to pull up.
- **Punch:** quick close-range attack.
- **Kick:** stronger, longer-range kick. Press while airborne for a flying kick that follows your normal jump movement, without a forward boost.
- **Block / drop:** hold to guard attacks from the direction you face. Blocking slows movement, prevents attacking and reduces damage/knockback. It does not protect your back. While hanging, it drops you from the ledge; moving away also releases it.
- **Umbrella:** opens automatically after a long descent, slows the fall, and closes on landing. Kicking or being hit closes it temporarily. Knocked-out fighters cannot use it.

Hits interrupt actions and impart backward momentum. The round bodies lean, wobble and can stumble after hits or hard landings. Dust appears on footsteps/landings; impacts and blocked hits have distinct particles. No camera shake is used because output must stay aligned with the room.

If a controller disconnects or loses focus, controls release. Disconnected fighters remain in the match. The host can remove players with × in the lobby. Room codes change on restart, so scan the current QR after relaunching.

## Verification

`npm run check` syntax-checks all application and test JavaScript. `npm test` runs only the active `test/*.test.js` suite, covering combat, blocking, knockback, falls, respawning, object collisions, ledge climbing, umbrellas, balance, four-player networking, reconnection, joining practice matches and sprite animation states.

`npm run test:desktop` starts an isolated native app, checks fullscreen output, pixel-level black/blackout, control-desk-to-projector geometry mirroring, character rendering, editor history, visibility controls, canvas navigation and window layout. It also exercises all game modes and phone controllers. It exits afterward. Run while the normal app is closed. It writes `desktop-smoke.json` and preview PNGs. The test uses a temporary data directory and preserves your saved arena. It also verifies phone refresh recovery and editor focus loss.

`npm run test:breakout-editor` checks live shape drawing on the desk and projector, moving/resizing/deleting the starting bricks, inspector edits, undo/redo, zoomed resizing, save/reopen/discard, and the resulting bricks at match start. It uses an isolated data directory and writes `nox-brick-editor-preview.png`.

`npm run test:projector` checks native fullscreen placement on the connected displays, live display switching and recovery after a failed output load; it briefly shows the output windows. `npm run test:sprites` verifies the car and umbrella atlases load and generates rendered previews. These checks also use isolated app profiles.

`npm run server` is available for browser debugging; it does not provide native projector window controls. Phones still use a browser, but the host/projector experience runs in Electron with isolated renderers and no Node access from web pages. Intended for trusted local networks, not public hosting.


## Named arenas and tracks

The main screen has a **Saved arenas** library. Enter a name and choose **Save new**. **Update selected** replaces the selected named save with the current layout. **Load selected** restores it, including its game mode, virtual-object visibility, and car track. Names must be unique (case insensitive).

While editing, Save new / Update selected stores the draft without ending editing; use **Save & finish** to apply it. Finish or cancel editing before loading another layout, so unsaved edits are not silently lost. Save/load is available in the lobby. Saved layouts live in `arenas.json`; the last applied geometry is in `arena.json`, and the last applied car track in `track.json`. Existing mantel calibration is preserved. Writes use temporary files and rename so an interrupted save does not truncate an existing file.

## Virtual platforms

Select a platform, wall or solid object in the editor and tick **Show selected object on projector** to draw it during play. Leave it unchecked when mapping a real object whose own surface supplies the scenery. Visibility affects drawing only: both kinds still collide and can be stood or climbed on. Calibration temporarily draws every object for alignment.

## Modes

Choose a mode in the lobby:

- **Brawl:** three lives; last fighter standing wins. Shorter jumps and gentler knockback keep fights close. Release and tap Jump again in the air for one double jump; landing or completing a climb restores it.
- **Parkour:** the highest platform/object top above the main mantel gets a finish flag. First to land or climb onto it wins. Players can punch and kick rivals off. Everyone has three lives; a sole remaining player must still reach the goal. Design reachable steps; the editor does not automatically prove a route is climbable.
- **Hot Potato · bomb tag:** a fresh, connected top-down arena is generated each round. Tag another player to pass a bomb without resetting its fuse. Its fuse sizzles and sparks, and the bomb flashes increasingly quickly near detonation. The holder bursts into popcorn, loses one point and immediately respawns; nobody is eliminated. A new bomb goes to another player. Move in four directions and hold Run for a limited sprint. After 90 seconds the highest score wins, with joint winners for ties. CPUs chase or escape, and solo testing keeps running for practice. The generated layout does not replace saved mantel geometry.
- **Nox Kart:** top-down car racing. Choose this mode and open **Edit arena & projection** to edit the track. Drag numbered points, add/remove points, adjust road width and choose 1–9 laps. Point 1 is the start/finish. Save the track using **Save & finish**, or store a named layout in the library. Tracks are closed polylines with rounded road joins; crossing tracks are possible, but ordered checkpoints prevent skipping straight to the finish.

### Car controls and items

Hold **Throttle** to drive forward or **Reverse** to back up, left/right to steer, and **Handbrake** while steering to drift. The car model preserves lateral momentum and reduces grip under handbraking. Barriers keep cars on the road, preserve motion along the wall and bounce head-on impacts with 80% of their perpendicular speed. Car-to-car bumps give a gentler shove, with a short contact cooldown to avoid repeated speed penalties on every frame. This is an arcade driving model, not a vehicle simulator.

Drive through glowing **?** boxes to pick up one random item. Boxes respawn after seven seconds. Tap the item button to use it: a **banana** drops behind you and spins a car that hits it; a **rocket** shoots straight ahead and spins/slows an opponent. Items cannot be used until collected. Reach every numbered checkpoint in order and complete the configured laps to win.

## Phone orientation and updated characters

Fighter and car controls both support portrait and landscape, with movement/steering on the left and action buttons on the right. Rotate at any time; controls reflow automatically, with safe-area padding and touch-sized buttons. Rotation releases held inputs to prevent stuck steering or movement. Fullscreen is optional.

The four brawlers have different heads and hairstyles, shirts and matching shoes in their player colour. They retain their wobbling animations and render at 88% of their previous size. Their feet remain anchored to the same calibrated surfaces; name/health text stays readable.


## Play solo against CPUs

Join from one phone and press **Start with 3 CPUs** on the main screen. Empty places are automatically filled to four players when starting any of the seven modes. Two or three human players also get CPUs for the remaining places; four humans play without CPUs. CPUs are marked in the lineup. Phones joining later take over CPU places, and Back to lobby removes the CPUs for the next setup. Watch practice still starts a CPU demonstration without any phones.

## Host phone and round results

The first connected phone becomes the host. Its controller can choose and start any game from the lobby or round results. The desktop also has a **Start next game** selector. Host responsibility moves to another connected human if the host disconnects. Other phones cannot start or change games. Every phone, including eliminated players, shows the winner and **Waiting for host** until the next round starts.

## Game audio

The desktop plays synthesized sounds for combat, footsteps, countdowns, racing engines, pickups, items, crashes, bomb fuse sizzling/ticking, popcorn bursts and victories. Use **Sound on/off** and the volume slider on the control desk. Audio plays through the PC's selected output device; phones and the projector window do not duplicate it.

## Brick Breakers

Four paddles and four balls play an Arkanoid-style round. Swipe horizontally on your phone to move your paddle. Anyone can save a ball; the last player to hit it earns the points for the next blocks it destroys. Each ball's owner has three lives. Clear all blocks or run out of balls to finish; highest score wins. Block hits create glowing shards and expanding impact rings.

Choose **Brick Breakers → Edit arena**. The editor opens in Select mode: click the starting bricks or any other brick area to select it, drag inside to move it, and drag a corner handle to resize it. The inspector also lets you change its shape, X/Y position, width and height, or remove it. The starting bricks are an ordinary editable rectangle.

Choose Rectangle, Ellipse or Triangle from the toolbar, then drag over the preview to add an area. A bright outline, dimensions and brick preview appear as you draw, on both the desk and projector. Releasing the pointer selects the new area ready for adjustment. Set **Ground level** numerically or drag its line. Undo/redo works for drawing, moving, resizing, property changes and deletion. Up to 20 areas and 500 bricks are supported. Use **Save & finish** to apply, or the named arena library to save and reload the block shapes and ground level.

## Doubles Pong

Two players join each side automatically: players 1 and 3 are Team Lime, and players 2 and 4 are Team Violet. Each player has an individual vertical bat at a distinct horizontal position, so teammates' bats never overlap. Swipe up/down anywhere in the phone's large touch area to move your bat. The horizontal court keeps a team score; first to seven wins. Empty player spots use CPUs in normal games.

## Shelfball

Two players per team use the same team order as Pong. An oversized ball bounces, rolls, collides with players and mapped obstacles, and responds to kicks and shoves. Use Jump, Shove and Kick to score in the opposite goal. First team to five wins. Teammates do not damage each other and players have unlimited respawns.

Shelfball uses the main mantel surface as its field, with a goal at each end. Choose **Use clear Shelfball pitch** in the lobby for a suitable flat field without obstacles, then adjust it in the usual arena editor to align with the projection. Save your existing layout first if you want to keep it in the library.

## Solo map testing

Join with exactly one phone, choose a mode and press **Test map — solo** (or **Solo test** on the host phone). Finish any editor changes first. No CPU competitors are added, deaths do not consume lives, and scores/timers do not automatically end the run. Pong tests return the ball from the far wall. Use **End test** on the host phone or **Back to lobby** on the desktop to stop, edit and retry. Other players can join after the test ends.

Brawl movement runs at 75% of its original speed, with gentler acceleration. Its first jump reaches about 62 pixels (previously 117), with one 49-pixel midair jump. Horizontal hit impulses are 45% gentler and vertical hit impulses 25% gentler. Walking off an edge still allows one recovery jump. Parkour and Shelfball retain their original jumps and hit impulses. Parkour retains the original speed. Airborne kicks do not boost the attacker's movement.

## Character sprites

Each player has a distinct chunky cartoon character: Moss has a dark swept quiff, Orbit has rounded purple curls, Ember has orange spikes and a beard, and Tide has blond side-parted hair and a curled moustache. Each identity has 16 fighting/traversal poses and an overhead sprite set used by Hot Potato. Shirts and shoes are recoloured together at runtime. Lean, squash, wobble, damage reactions and umbrellas still respond to game physics. The existing 88% character scale is retained. Procedural artwork remains as a fallback while images load.

All atlases were created with the built-in image generation tool, with transparent backgrounds. The exact final prompt set and saved production assets are:

| Asset | Saved atlas | Exact prompt |
| --- | --- | --- |
| Moss | [brawler-sprites.png](public/brawler-sprites.png) | [brawler-sprites.prompt.txt](public/brawler-sprites.prompt.txt) |
| Orbit | [brawler-orbit.png](public/brawler-orbit.png) | [orbit-sprites.prompt.txt](public/orbit-sprites.prompt.txt) |
| Ember | [brawler-ember.png](public/brawler-ember.png) | [ember-sprites.prompt.txt](public/ember-sprites.prompt.txt) |
| Tide | [brawler-tide.png](public/brawler-tide.png) | [tide-sprites.prompt.txt](public/tide-sprites.prompt.txt) |
| All four overhead identities | [maze-characters.png](public/maze-characters.png) | [maze_identities-sprites.prompt.txt](public/maze_identities-sprites.prompt.txt) |
| Four racing cars | [car-sprites.png](public/car-sprites.png) | [car-sprites.prompt.txt](public/car-sprites.prompt.txt) |
| Umbrella descent, two poses per character | [umbrella-sprites.png](public/umbrella-sprites.png) | [umbrella-sprites.prompt.txt](public/umbrella-sprites.prompt.txt) |

Nox Kart uses four different car sprites matched to player colours. Their heading follows the driving physics, including drifting and reverse. Umbrella descent uses two alternating poses for each character, including the raised hand, canopy and dangling legs. The new atlases have real transparency and their bounds are stored in `public/extra-sprite-data.js`. Rendered previews are `nox-racing-sprites-preview.png` and `nox-umbrella-sprites-preview.png`.

The original shared overhead reference is retained in `public/maze-sprites.png`, with its prompt in `public/maze-sprites.prompt.txt`. Atlas bounds in `public/sprites.js` and `public/sprite-data.js` follow each complete pose, including extended gloves and boots. `nox-party-characters-preview.png` shows the four identities and their matching shoes.

## Logo

The joystick/projector logo puts the icon and NOX on the first line, with PARTY below. It is stored at `public/nox-party-logo.png`, with its exact generation prompt at `public/nox-party-logo.prompt.txt`. It was created with the built-in image generation tool and has a transparent background. The previous horizontal version is retained at `public/nox-party-logo-horizontal.png`.

## Repository and development

The repository contains the Electron desktop shell (`desktop/`), game server and simulations (root JavaScript files), browser renderers and phone UI (`public/`), sprite assets and their prompts, and automated tests. `test-support/` contains isolated local-server fixtures. GitHub Actions runs syntax and gameplay/network checks on Windows and Linux using Node 24. Native projector and phone UI checks run locally with Electron.

Personal calibration (`arena.json`, `track.json`, `breakout.json`), your named arena library (`arenas.json`), installed dependencies, local logs, review snapshots and generated screenshots are excluded from Git. Fresh checkouts use the built-in default layouts. Back up the four local JSON files separately if you want to transfer your room setup to another PC.
