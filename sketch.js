// =====================================================================
//  HEAR NO EVIL  —  a flashlight horror escape
//  The player is deaf: music is muffled & quiet, the vampire's whisper
//  only grows audible as it closes in.
// =====================================================================

const CANVAS_W = 800;
const CANVAS_H = 800;
// Default world size. The levels are different sizes, so initGame() overrides
// these from whatever the loaded map actually covers — otherwise the smaller
// level lets you walk off the edge of the tiles into undrawn space.
const WORLD_W = 2000;
const WORLD_H = 1000;
let worldW = WORLD_W;
let worldH = WORLD_H;
const PLAYER_SPEED = 3.2;
const PLAYER_RADIUS = 25;
const FLASHLIGHT_DISTANCE = 300;
const FLASHLIGHT_ANGLE = Math.PI / 2;
const CAM_SMOOTHING = 0.08;

const TITLE_FONT = "Creepster, Nosifer, cursive";

let player;
let camera;
let walls = [];
let tables = [];
let keyItem;
let door;
let gameState; // "start" | "tutorial" | "play" | "win" | "gameover"
let pressedKeys = {};
let fogLayer;
let vampire;
let vampireImg, playerImg, keyImg, tableImg, deathImg, doorImg;
let dotImg;
let dinnertableImg, chairbackImg, signImg;
let carpetCornerImg, carpetMiddleImg, carpetTopImg;
let shakeX = 0,
  shakeY = 0;

// Tile map. These three always point at the CURRENT level's tileset;
// initGame() swaps them when you move from the mansion to the courtyard.
let tileWallImg, tileCornerImg, tileFloorImg;
let tileMapData;
let TILE_SIZE = 40;
let mapCols = 50;
let mapRows = 40;

// Level 1 — the mansion interior. Its walls are auto-tiled: the map only
// marks '@' for "wall here" and the renderer picks the straight / corner /
// tee / cross piece from the four neighbours, so junctions always meet up.
let mansionMapData, mansionFloorImg, mansionWallImg, mansionCornerImg;
let wallVerticalImg, wallHorizontalImg, wallCornerImg, wallTeeImg, wallPlusImg;
let doorLeafImg;

// Level 2 — the overgrown courtyard.
let courtyardMapData, cyFloorImg, cyWallImg, cyCornerImg;
let cyMossImg, cyIvyImg, hedgeImg, flowerBushImg;
let poolImg, wellImg, crateImg, gateImg, puddleImg;

let currentLevel = 0;

// Every character that blocks movement and casts a flashlight shadow.
// Mansion: walls, corners, tables, sign. Courtyard: hedges, water, the well,
// crates, the boarded gate.
const SOLID_CHARS = "LRUBNESWCTDG@#%~opqvkX";

// Walkable, but standing on one ends the run. Kept separate from SOLID_CHARS
// because a puddle has to let you in — that's the whole point of it.
const HAZARD_CHARS = "*";

// Tutorial / intro
let tutorialStartX = 0,
  tutorialStartY = 0;
let tutorialIntroDismissed = false;

// Smooth room-to-room fade transition
let fadeActive = false;
let fadePhase = ""; // "out" | "in"
let fadeAlpha = 0;
let fadeCallback = null;

// Flashlight flicker
let lightOn = true;
let flickering = false;
let flickerStart = 0;
let flickerDur = 0;
let nextFlickerAt = 0;
let nextStrobe = 0;

// Audio
let bgMusic, whisperSound, musicFilter, whisperFilter;
let seenSound, gameoverSound, ringingSound;
let footstep1, footstep2, breathingSound, bodyFilter;
let musicReady = false,
  whisperReady = false;
let seenReady = false,
  gameoverReady = false,
  ringingReady = false;
let footstep1Ready = false,
  footstep2Ready = false,
  breathingReady = false;
let wantAudio = false;
let whisperVol = 0;

// Movement-driven body audio
const STEP_INTERVAL = 360; // ms between footsteps (brisk walk)
let footIndex = 0;
let lastStepTime = 0;
let breathingVol = 0;
let playerMoveAmount = 0;

// Kill-cam (plays before the death screen)
const DEATH_CAM_MS = 1500;
let deathStart = 0;
let killPos = null;

// Knockout — walking into standing water puts you on the floor rather than
// killing you. You keep the level, but you lose your feet, your light and
// about a second and a half, which is plenty of time for something to reach
// you. Short on purpose: it should read as a punishment, not a cutscene.
const KO_MS = 1500;
// You come round still lying in the puddle, so without a grace period the very
// next frame knocks you straight back out and you can never walk clear. This is
// long enough to get well off the tile at walking pace.
const KO_GRACE_MS = 1600;
let koActive = false;
let koStart = 0;
let koGraceUntil = 0;

// ---------------------------------------------------------------------
// Tiles are all 32x32 and get scaled to TILE_SIZE on draw, so every new
// courtyard asset is authored at the same size as the mansion set.
function loadTile(name) {
  return loadImage(
    "assets/images/" + name + ".png",
    () => {},
    () => {},
  );
}

function preload() {
  mansionWallImg = loadTile("wall");
  mansionCornerImg = loadTile("corner");
  mansionFloorImg = loadTile("floor");

  // Auto-tiling wall set for the mansion
  wallVerticalImg = loadTile("wallVertical");
  wallHorizontalImg = loadTile("wallHorizontal");
  wallCornerImg = loadTile("wallCorner");
  wallTeeImg = loadTile("wallTee");
  wallPlusImg = loadTile("wallPlus");
  doorLeafImg = loadTile("doorLeaf");
  playerImg = loadImage(
    "assets/images/mainguy2.png",
    () => {},
    () => {},
  );
  vampireImg = loadImage(
    "assets/images/Vampire.png",
    () => {},
    () => {},
  );
  keyImg = loadImage(
    "assets/images/key.png",
    () => {},
    () => {},
  );
  tableImg = loadImage(
    "assets/images/table.png",
    () => {},
    () => {},
  );
  deathImg = loadImage(
    "assets/images/death.png",
    () => {},
    () => {},
  );
  doorImg = loadImage(
    "assets/images/Door.png",
    () => {},
    () => {},
  );
  dotImg = loadImage(
    "assets/images/dot.png",
    () => {},
    () => {},
  );
  dinnertableImg = loadImage(
    "assets/images/dinnertable.png",
    () => {},
    () => {},
  );
  chairbackImg = loadImage(
    "assets/images/chairback.png",
    () => {},
    () => {},
  );
  signImg = loadImage(
    "assets/images/sign.png",
    () => {},
    () => {},
  );
  carpetCornerImg = loadImage(
    "assets/images/carpetcorner.png",
    () => {},
    () => {},
  );
  carpetMiddleImg = loadImage(
    "assets/images/carpetmiddle.png",
    () => {},
    () => {},
  );
  carpetTopImg = loadImage(
    "assets/images/carpettop.png",
    () => {},
    () => {},
  );

  // Courtyard tileset (level 2)
  cyFloorImg = loadTile("courtyardfloor");
  cyMossImg = loadTile("courtyardmoss");
  cyIvyImg = loadTile("ivy");
  cyWallImg = loadTile("courtyardwall");
  cyCornerImg = loadTile("courtyardcorner");
  hedgeImg = loadTile("hedge");
  flowerBushImg = loadTile("flowerbush");
  poolImg = loadTile("poolwater");
  puddleImg = loadTile("puddle");
  wellImg = loadTile("wellquarter");
  crateImg = loadTile("crate");
  gateImg = loadTile("gate");

  mansionMapData = loadJSON("data/blocks.json");
  courtyardMapData = loadJSON("data/courtyard.json");
}

// Both levels share the same tile-map format; only the art and the layout
// differ, so drawRoom()/initGame() stay level-agnostic.
const LEVELS = [
  {
    name: "The Mansion",
    data: () => mansionMapData,
    floor: () => mansionFloorImg,
    wall: () => mansionWallImg,
    corner: () => mansionCornerImg,
  },
  {
    name: "The Courtyard",
    data: () => courtyardMapData,
    floor: () => cyFloorImg,
    wall: () => cyWallImg,
    corner: () => cyCornerImg,
  },
];

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  fogLayer = createGraphics(CANVAS_W, CANVAS_H);
  textFont("monospace");
  noCursor();
  camera = { x: 0, y: 0 };

  // The tutorial room is drawn with the mansion tileset, before any level
  // has been loaded, so point at level 1 up front.
  applyLevelTileset(0);

  if (tileMapData) {
    TILE_SIZE = tileMapData.tileSize || TILE_SIZE;
    mapCols = tileMapData.cols || mapCols;
    mapRows = tileMapData.rows || mapRows;
  }

  loadAudio();
  nextFlickerAt = millis() + random(8000, 16000);

  gameState = "start";
}

// ---------------------------------------------------------------------
//  AUDIO
// ---------------------------------------------------------------------
function loadAudio() {
  if (typeof loadSound !== "function") return;
  try {
    bgMusic = loadSound(
      "assets/sounds/scarymusic.mp3",
      () => {
        musicReady = true;
        setupMusic();
        maybeStartAudio();
      },
      () => console.warn("scarymusic.mp3 not found — music disabled."),
    );
    whisperSound = loadSound(
      "assets/sounds/whisper.mp3",
      () => {
        whisperReady = true;
        setupWhisper();
        maybeStartAudio();
      },
      () => console.warn("whisper.mp3 not found — whisper disabled."),
    );
    // One-shot scare stings (kept clear/unmuffled on purpose)
    seenSound = loadSound(
      "assets/sounds/seen.mp3",
      () => {
        seenReady = true;
      },
      () => console.warn("seen.mp3 not found — disabled."),
    );
    gameoverSound = loadSound(
      "assets/sounds/gameover.mp3",
      () => {
        gameoverReady = true;
      },
      () => console.warn("gameover.mp3 not found — disabled."),
    );
    // Tinnitus ring for the knockout. Left unfiltered like the other stings:
    // the ringing is inside his head, not a sound in the room, so the muffling
    // that stands in for his hearing loss shouldn't apply to it.
    ringingSound = loadSound(
      "assets/sounds/ringing.wav",
      () => {
        ringingReady = true;
      },
      () => console.warn("ringing.wav not found — disabled."),
    );
    // Player body sounds (own footsteps + scared breathing), lightly muffled.
    footstep1 = loadSound(
      "assets/sounds/footstep1.mp3",
      () => {
        footstep1Ready = true;
        connectBody(footstep1);
      },
      () => console.warn("footstep1.mp3 not found — disabled."),
    );
    footstep2 = loadSound(
      "assets/sounds/footstep2.mp3",
      () => {
        footstep2Ready = true;
        connectBody(footstep2);
      },
      () => console.warn("footstep2.mp3 not found — disabled."),
    );
    breathingSound = loadSound(
      "assets/sounds/breathing.mp3",
      () => {
        breathingReady = true;
        connectBody(breathingSound);
        maybeStartAudio();
      },
      () => console.warn("breathing.mp3 not found — disabled."),
    );
  } catch (e) {
    console.warn("p5.sound unavailable:", e);
  }
}

// Shared light low-pass so the character's own body sounds feel muffled too.
function connectBody(snd) {
  try {
    if (!bodyFilter) {
      bodyFilter = new p5.LowPass();
      bodyFilter.freq(1200);
      bodyFilter.res(1);
    }
    snd.disconnect();
    snd.connect(bodyFilter);
    snd.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function setupMusic() {
  try {
    musicFilter = new p5.LowPass(); // muffle (deaf perspective)
    musicFilter.freq(480);
    musicFilter.res(2);
    bgMusic.disconnect();
    bgMusic.connect(musicFilter);
    bgMusic.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function setupWhisper() {
  try {
    whisperFilter = new p5.LowPass();
    whisperFilter.freq(820);
    whisperSound.disconnect();
    whisperSound.connect(whisperFilter);
    whisperSound.setVolume(0.0);
  } catch (e) {
    /* filter optional */
  }
}

function playOneShot(snd, ready, vol) {
  if (!ready || !snd) return;
  try {
    snd.setVolume(vol);
    snd.play();
  } catch (e) {}
}

function startAudio() {
  wantAudio = true;
  try {
    if (typeof userStartAudio === "function") userStartAudio();
  } catch (e) {}
  maybeStartAudio();
}

function maybeStartAudio() {
  if (!wantAudio) return;
  if (musicReady && bgMusic && !bgMusic.isPlaying()) {
    try {
      bgMusic.setVolume(0.01);
      bgMusic.loop();
    } catch (e) {}
  }
  if (whisperReady && whisperSound && !whisperSound.isPlaying()) {
    try {
      whisperSound.setVolume(0.0);
      whisperSound.loop();
    } catch (e) {}
  }
  if (breathingReady && breathingSound && !breathingSound.isPlaying()) {
    try {
      breathingSound.setVolume(0.0);
      breathingSound.loop();
      if (typeof breathingSound.rate === "function") breathingSound.rate(0.9); // ~10% slower
    } catch (e) {}
  }
}

// Proximity whisper: faintly audible even far off, ramping up sharply
// the closer the vampire gets, loud when it's right beside you.
// Directional: panned to the vampire's real side, and the left ear only
// hears ~60% (that ear is more deaf).
function updateWhisper() {
  if (!whisperReady || !whisperSound) return;
  const near = 45,
    far = 800,
    maxV = 0.85;
  let d = dist(player.x, player.y, vampire.x, vampire.y);
  let v;
  if (d >= far) {
    v = 0;
  } else {
    let t = constrain(1 - (d - near) / (far - near), 0, 1); // 1 close -> 0 far
    let proximity = maxV * pow(t, 1.5); // steep ramp = noticeable
    let floorFade = constrain((far - d) / 140, 0, 1);
    let floorVol = 0.14 * floorFade; // still hear it a bit when far
    v = max(floorVol, proximity);
  }
  whisperVol = lerp(whisperVol, v, 0.15);

  // Direction based on his real left/right position relative to you.
  let panX = constrain((vampire.x - player.x) / 300, -1, 1);
  // Left ear is more deaf: only 40% on the far left, full on the right.
  let earFactor = panX < 0 ? lerp(1.0, 0.2, -panX) : 1.0;

  try {
    whisperSound.setVolume(whisperVol * earFactor);
    if (typeof whisperSound.pan === "function") whisperSound.pan(panX, 0.1);
  } catch (e) {}
}

// Footsteps (two clips alternating while moving) + scared breathing that
// rises with movement and drops when you slow or stop. Centered (own body).
function updateMovementAudio() {
  let moving = playerMoveAmount > 0.5;

  if (moving && footstep1Ready && footstep2Ready) {
    let now = millis();
    if (now - lastStepTime >= STEP_INTERVAL) {
      lastStepTime = now;
      let s = footIndex === 0 ? footstep1 : footstep2;
      footIndex = 1 - footIndex;
      try {
        s.setVolume(0.14); // there, but not loud
        s.play();
      } catch (e) {}
    }
  }

  if (breathingReady && breathingSound) {
    let target = moving ? 0.1 : 0.02; // quieter when slowed/stopped
    breathingVol = lerp(breathingVol, target, 0.08);
    try {
      breathingSound.setVolume(breathingVol);
    } catch (e) {}
  }
}

// ---------------------------------------------------------------------
//  LEVEL SETUP
// ---------------------------------------------------------------------
function initTutorial() {
  const rx = 100,
    ry = 140;
  const cols = 15,
    rows = 13;

  player = {
    x: rx + 2 * TILE_SIZE + TILE_SIZE / 2,
    y: ry + floor(rows / 2) * TILE_SIZE + TILE_SIZE / 2,
    r: PLAYER_RADIUS,
    hasKey: false,
  };

  camera = { x: 0, y: 0 };
  // The tutorial room is built in code rather than from a map, so give it its
  // own bounds: one canvas, no scrolling, with room to step out of the doorway.
  worldW = 800;
  worldH = 800;
  walls = [];
  tables = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let isWall = row === 0 || row === rows - 1 || col === 0;
      let isDoorOpening = col === cols - 1 && row >= 5 && row <= 6;
      if (col === cols - 1 && !isDoorOpening) isWall = true;
      if (isWall) {
        walls.push({
          x: rx + col * TILE_SIZE,
          y: ry + row * TILE_SIZE,
          w: TILE_SIZE,
          h: TILE_SIZE,
        });
      }
    }
  }

  // Tutorial desk, flush below the top wall
  let tutTableX = rx + 7 * TILE_SIZE;
  let tutTableY = ry + 1 * TILE_SIZE;
  walls.push({ x: tutTableX, y: tutTableY, w: TILE_SIZE, h: TILE_SIZE });
  tables.push({ x: tutTableX, y: tutTableY, w: TILE_SIZE, h: TILE_SIZE });

  // Flush in the wall line: one tile thick, two tiles along the wall, so each
  // of the two leaves is exactly one 32x32 texture drawn square.
  door = {
    x: rx + (cols - 1) * TILE_SIZE,
    y: ry + 5 * TILE_SIZE,
    w: TILE_SIZE,
    h: 2 * TILE_SIZE,
    isOpen: false,
  };

  keyItem = {
    x: rx + 11 * TILE_SIZE + TILE_SIZE / 2,
    y: ry + floor(rows / 2) * TILE_SIZE + TILE_SIZE / 2,
    r: 14,
    collected: false,
  };

  tutorialStartX = player.x;
  tutorialStartY = player.y;
  tutorialIntroDismissed = false;
  gameState = "tutorial";
}

// Swap the map data and the three shared tile images over to a level.
function applyLevelTileset(level) {
  currentLevel = constrain(level, 0, LEVELS.length - 1);
  const lvl = LEVELS[currentLevel];
  tileMapData = lvl.data();
  tileFloorImg = lvl.floor();
  tileWallImg = lvl.wall();
  tileCornerImg = lvl.corner();
}

function initGame(level) {
  applyLevelTileset(level === undefined ? currentLevel : level);

  if (tileMapData) {
    TILE_SIZE = tileMapData.tileSize || TILE_SIZE;
    mapCols = tileMapData.cols || mapCols;
    mapRows = tileMapData.rows || mapRows;
  }

  // The playable area is exactly what the map covers.
  worldW = mapCols * TILE_SIZE;
  worldH = mapRows * TILE_SIZE;

  // Original-map positions (JSON may override spawn/vampire/door).
  const spawn = (tileMapData && tileMapData.spawn) || { x: 200, y: 200 };
  const vampPos = (tileMapData && tileMapData.vampire) || { x: 1700, y: 1200 };
  const doorPos = (tileMapData && tileMapData.door) || {
    x: worldW - 3 * TILE_SIZE,
    y: 700,
    w: 2 * TILE_SIZE,
    h: 200,
  };

  player = { x: spawn.x, y: spawn.y, r: PLAYER_RADIUS, hasKey: false };

  walls = [];
  tables = [];
  if (tileMapData && tileMapData.tiles) {
    for (let row = 0; row < mapRows; row++) {
      let line = tileMapData.tiles[row] || "";
      for (let col = 0; col < mapCols; col++) {
        let ch = line[col] || ".";
        if (SOLID_CHARS.indexOf(ch) !== -1) {
          walls.push({
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
          });
        }
        if (ch === "T") {
          tables.push({
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
          });
        }
      }
    }
  }

  // Key spawns in a random, reachable spot each game.
  const keyPos = pickRandomKeyTile(spawn.x, spawn.y);
  keyItem = { x: keyPos.x, y: keyPos.y, r: 16, collected: false };

  // Exit door aligned with the opening in the right wall.
  door = {
    x: doorPos.x,
    y: doorPos.y,
    w: doorPos.w,
    h: doorPos.h,
    isOpen: false,
  };

  vampire = {
    x: vampPos.x,
    y: vampPos.y,
    r: 25,
    state: "chasing",
    stunTimer: 0,
    shakeStartTime: -Infinity,
    wasInCone: false,
  };

  whisperVol = 0;
  koActive = false;
  koGraceUntil = 0;
  vampPath = [];
  vampRepathAt = 0;
  buildVampGrid();
  gameState = "play";
}

function restartGame() {
  startAudio();
  // Dying drops you back at the start of the level you were on; finishing the
  // last level and pressing R starts the whole escape over.
  initGame(gameState === "win" ? 0 : currentLevel);
}

// Flood-fill from the spawn over walkable floor, then pick a random reachable
// tile a fair distance away — guarantees the key is never sealed off.
function pickRandomKeyTile(spawnX, spawnY) {
  if (!(tileMapData && tileMapData.tiles)) return { x: 1300, y: 950 };
  const tiles = tileMapData.tiles;
  // Anything not solid is walkable — that includes the courtyard's moss and
  // ivy ground cover, so a patch of it never seals off part of the map.
  // Puddles count as blocked here: the key must never end up somewhere you
  // can only reach by dying to get there.
  const isFloor = (c, r) => {
    if (r < 0 || r >= mapRows || c < 0 || c >= mapCols) return false;
    const ch = (tiles[r] || "")[c] || ".";
    return SOLID_CHARS.indexOf(ch) === -1 && HAZARD_CHARS.indexOf(ch) === -1;
  };

  const startC = floor(spawnX / TILE_SIZE);
  const startR = floor(spawnY / TILE_SIZE);
  const seen = new Set([startC + "," + startR]);
  const queue = [[startC, startR]];
  const reachable = [];

  while (queue.length) {
    const [c, r] = queue.shift();
    reachable.push([c, r]);
    for (const [nc, nr] of [
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
      [c, r - 1],
    ]) {
      const k = nc + "," + nr;
      if (!seen.has(k) && isFloor(nc, nr)) {
        seen.add(k);
        queue.push([nc, nr]);
      }
    }
  }

  const candidates = reachable.filter(([c, r]) => {
    const cx = c * TILE_SIZE + TILE_SIZE / 2;
    const cy = r * TILE_SIZE + TILE_SIZE / 2;
    // Keep clear of the exit — a key behind the locked door cannot be picked
    // up, so the run would be unwinnable — and don't drop it in your lap.
    return c < mapCols - 3 && dist(cx, cy, spawnX, spawnY) > 350;
  });

  const pool = candidates.length ? candidates : reachable;
  const pick = pool[floor(random(pool.length))];
  return {
    x: pick[0] * TILE_SIZE + TILE_SIZE / 2,
    y: pick[1] * TILE_SIZE + TILE_SIZE / 2,
  };
}

// ---------------------------------------------------------------------
//  MAIN LOOP
// ---------------------------------------------------------------------
function draw() {
  background(0);

  if (gameState === "start") {
    drawStartScreen();
    drawCursor();
    return;
  }

  updateFlicker();
  // His torch is out cold along with him — this is what lets the vampire close
  // the gap, since nothing can be frozen by a light that isn't on.
  if (koActive) lightOn = false;

  // Rebuilt before anything asks what the light can reach this frame.
  if (player && door) frameOccluders = getNearbyOccluders();

  const frozen =
    fadeActive || (gameState === "tutorial" && !tutorialIntroDismissed);

  if (!frozen) {
    if (gameState === "tutorial") {
      updatePlayer();
      updateMovementAudio();
      checkKeyPickup();
      checkTutorialCompletion();
    } else if (gameState === "play") {
      updateKnockout();
      if (!koActive) {
        // He's on the floor: no input, no footsteps, and no chance to walk
        // out of the puddle he's lying in.
        updatePlayer();
        updateMovementAudio();
        checkPuddleSlip();
      }
      updateVampire();
      checkKeyPickup();
      checkWinCondition();
      checkVampireCatch();
      updateWhisper();
    }
  }

  updateCamera();
  computeShake();

  // World (tiles) first
  push();
  translate(-camera.x + shakeX, -camera.y + shakeY);
  if (gameState === "tutorial") drawTutorialRoom();
  else drawRoom();
  pop();

  if (gameState === "dying") {
    drawDeathCam();
  } else {
    drawFog();

    // Entities above fog
    push();
    translate(-camera.x + shakeX, -camera.y + shakeY);
    drawDoor();
    drawFurniture();
    drawPlayer();
    drawKey();
    if (gameState === "play") drawVampire();
    pop();
  }

  drawKnockout();

  // HUD
  if (gameState === "tutorial") drawTutorialUI();
  else if (gameState === "play") drawUI();

  if (gameState === "win") drawWinScreen();
  if (gameState === "gameover") drawGameOverScreen();

  if (gameState === "tutorial" && !tutorialIntroDismissed) drawTutorialIntro();

  drawFade();
  drawMinimap();
  drawCursor();
}

function drawMinimap() {
  if (gameState !== "play" || !(tileMapData && tileMapData.tiles)) return;

  const margin = 16;
  const minimapW = 180;
  const minimapH = 140;
  const minimapX = margin;
  const minimapY = height - minimapH - margin;
  const scaleX = minimapW / worldW;
  const scaleY = minimapH / worldH;

  push();
  translate(minimapX, minimapY);

  noStroke();
  fill(0, 170);
  rect(0, 0, minimapW, minimapH, 10);

  stroke(170);
  strokeWeight(1.5);
  noFill();
  rect(0, 0, minimapW, minimapH, 10);

  fill(180);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text("MAP", 10, 8);

  // Draw the room layout walls/obstacles in a subtle tone.
  fill(120, 120, 140, 220);
  noStroke();
  for (let row = 0; row < mapRows; row++) {
    const line = tileMapData.tiles[row] || "";
    for (let col = 0; col < mapCols; col++) {
      const ch = line[col] || ".";
      if (SOLID_CHARS.includes(ch)) {
        rect(
          col * TILE_SIZE * scaleX,
          row * TILE_SIZE * scaleY,
          TILE_SIZE * scaleX,
          TILE_SIZE * scaleY,
        );
      }
    }
  }

  if (player) {
    fill(255, 220, 80);
    noStroke();
    ellipse(player.x * scaleX, player.y * scaleY, 6, 6);
  }

  pop();
}

// Custom mouse cursor, centered on the pointer, always drawn last so it
// sits above the darkness overlay and every other layer.
function drawCursor() {
  push();
  imageMode(CENTER);
  noStroke();
  if (dotImg && dotImg.width) {
    image(dotImg, mouseX, mouseY, dotImg.width, dotImg.height);
  } else {
    fill(255);
    ellipse(mouseX, mouseY, 6);
  }
  pop();
}

function computeShake() {
  shakeX = 0;
  shakeY = 0;

  if (gameState === "dying") {
    let t = constrain((millis() - deathStart) / DEATH_CAM_MS, 0, 1);
    let amt = lerp(22, 4, t); // hard jolt that settles
    shakeX = random(-amt, amt);
    shakeY = random(-amt, amt);
    return;
  }

  if (gameState !== "play") return;

  if (millis() - vampire.shakeStartTime < 600) {
    shakeX = random(-34, 34);
    shakeY = random(-34, 34);
  }
  if (vampire.state === "chasing") {
    let d = dist(player.x, player.y, vampire.x, vampire.y);
    if (d < 150) {
      let intensity = map(d, 150, 50, 1.5, 4.5, true);
      shakeX += random(-intensity, intensity);
      shakeY += random(-intensity, intensity);
    }
  }
}

function updateCamera() {
  // max() guards the case where a level is smaller than the canvas.
  let targetX = constrain(player.x - CANVAS_W / 2, 0, max(0, worldW - CANVAS_W));
  let targetY = constrain(player.y - CANVAS_H / 2, 0, max(0, worldH - CANVAS_H));
  camera.x = lerp(camera.x, targetX, CAM_SMOOTHING);
  camera.y = lerp(camera.y, targetY, CAM_SMOOTHING);
}

// ---------------------------------------------------------------------
//  FLICKER
// ---------------------------------------------------------------------
function updateFlicker() {
  let t = millis();
  if (!flickering) {
    if (t >= nextFlickerAt) {
      flickering = true;
      flickerStart = t;
      flickerDur = random(220, 650);
      nextStrobe = 0;
    } else {
      lightOn = true;
    }
  }
  if (flickering) {
    if (t - flickerStart >= flickerDur) {
      flickering = false;
      lightOn = true;
      nextFlickerAt = t + random(12000, 28000); // very rare
    } else if (t >= nextStrobe) {
      nextStrobe = t + random(35, 75);
      lightOn = random() < 0.4; // mostly dark during a flicker
    }
  }
}

// ---------------------------------------------------------------------
//  PLAYER MOVEMENT
// ---------------------------------------------------------------------
function updatePlayer() {
  let startX = player.x,
    startY = player.y;
  let moveX = 0,
    moveY = 0;

  if (keyIsDown(LEFT_ARROW)) moveX -= PLAYER_SPEED;
  if (keyIsDown(RIGHT_ARROW)) moveX += PLAYER_SPEED;
  if (keyIsDown(UP_ARROW)) moveY -= PLAYER_SPEED;
  if (keyIsDown(DOWN_ARROW)) moveY += PLAYER_SPEED;

  if (pressedKeys["a"] || pressedKeys["A"]) moveX -= PLAYER_SPEED;
  if (pressedKeys["d"] || pressedKeys["D"]) moveX += PLAYER_SPEED;
  if (pressedKeys["w"] || pressedKeys["W"]) moveY -= PLAYER_SPEED;
  if (pressedKeys["s"] || pressedKeys["S"]) moveY += PLAYER_SPEED;

  movePlayer(moveX, 0);
  movePlayer(0, moveY);

  playerMoveAmount = dist(startX, startY, player.x, player.y);
}

function movePlayer(dx, dy) {
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (
    !collidesWithWalls(nextX, player.y) &&
    !collidesWithDoor(nextX, player.y)
  ) {
    player.x = nextX;
  }
  if (
    !collidesWithWalls(player.x, nextY) &&
    !collidesWithDoor(player.x, nextY)
  ) {
    player.y = nextY;
  }

  player.x = constrain(player.x, player.r, worldW - player.r);
  player.y = constrain(player.y, player.r, worldH - player.r);
}

// radius defaults to the player's, but the vampire collides against the same
// geometry now, so it has to be able to ask on its own behalf.
function collidesWithWalls(cx, cy, radius) {
  const r0 = radius === undefined ? player.r : radius;
  if (gameState !== "tutorial" && tileMapData && tileMapData.tiles) {
    let colLeft = constrain(floor((cx - r0) / TILE_SIZE), 0, mapCols - 1);
    let colRight = constrain(floor((cx + r0) / TILE_SIZE), 0, mapCols - 1);
    let rowTop = constrain(floor((cy - r0) / TILE_SIZE), 0, mapRows - 1);
    let rowBottom = constrain(floor((cy + r0) / TILE_SIZE), 0, mapRows - 1);

    for (let r = rowTop; r <= rowBottom; r++) {
      let line = tileMapData.tiles[r] || "";
      for (let c = colLeft; c <= colRight; c++) {
        let ch = line[c] || ".";
        if (SOLID_CHARS.indexOf(ch) !== -1) {
          if (
            circleRectCollision(
              cx,
              cy,
              player.r,
              c * TILE_SIZE,
              r * TILE_SIZE,
              TILE_SIZE,
              TILE_SIZE,
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  for (let wall of walls) {
    if (circleRectCollision(cx, cy, player.r, wall.x, wall.y, wall.w, wall.h))
      return true;
  }
  return false;
}

function collidesWithDoor(cx, cy) {
  if (door.isOpen) return false;
  return circleRectCollision(cx, cy, player.r, door.x, door.y, door.w, door.h);
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  let closestX = constrain(cx, rx, rx + rw);
  let closestY = constrain(cy, ry, ry + rh);
  let dx = cx - closestX;
  let dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

// ---------------------------------------------------------------------
//  KEY / WIN / VAMPIRE
// ---------------------------------------------------------------------
function checkKeyPickup() {
  if (keyItem.collected) return;
  if (dist(player.x, player.y, keyItem.x, keyItem.y) < player.r + keyItem.r) {
    keyItem.collected = true;
    player.hasKey = true;
    door.isOpen = true;
  }
}

function checkWinCondition() {
  if (!player.hasKey || fadeActive) return;
  // The door sits flush in the wall, so its far face is the edge of the world
  // and nothing can get past it. Stepping into the doorway is the escape.
  if (
    player.x > door.x &&
    player.y > door.y - player.r &&
    player.y < door.y + door.h + player.r
  ) {
    // Escaping the mansion only gets you as far as the courtyard.
    if (currentLevel < LEVELS.length - 1) {
      startFade(() => initGame(currentLevel + 1));
    } else {
      gameState = "win";
    }
  }
}

function updateVampire() {
  let inCone = isInFlashlight(vampire.x, vampire.y);

  if (vampire.state === "chasing") {
    if (inCone) {
      if (!vampire.wasInCone) {
        vampire.shakeStartTime = millis();
        playOneShot(seenSound, seenReady, 0.01); // nearly inaudible
      }
      vampire.state = "stunned";
      vampire.stunTimer = millis();
    } else {
      huntPlayer();
    }
  } else if (vampire.state === "stunned") {
    if (millis() - vampire.stunTimer >= 2000) vampire.state = "chasing";
  }

  vampire.wasInCone = inCone;
}

// The vampire used to phase straight through walls. That made it unfair in a
// different way to the one intended — it also made the layout irrelevant, since
// no wall, hedge or table ever changed its route. It now walks the same floor
// the player does, following a breadth-first path over the tile grid so it
// still rounds corners and comes through doorways instead of pressing itself
// against the far side of a wall.
const VAMP_REPATH_MS = 220;
let vampPath = [];
let vampRepathAt = 0;

// Pathfinding runs over half-tile nodes marked with whether a 25px body
// actually fits there, NOT over tile centres. That distinction matters: in a
// two-tile doorway both tile centres sit 20px from a wall, so a 25px body fits
// at neither, and a route through tile centres wedges itself in the opening.
const VAMP_GRID = TILE_SIZE / 2;
let vampGridW = 0,
  vampGridH = 0,
  vampFree = null;

// Built from the tile data directly rather than via collidesWithWalls(), which
// branches on gameState and isn't settled yet while a level is initialising.
function vampBodyFits(x, y, r) {
  if (x < r || y < r || x > worldW - r || y > worldH - r) return false;
  const c0 = constrain(floor((x - r) / TILE_SIZE), 0, mapCols - 1);
  const c1 = constrain(floor((x + r) / TILE_SIZE), 0, mapCols - 1);
  const r0 = constrain(floor((y - r) / TILE_SIZE), 0, mapRows - 1);
  const r1 = constrain(floor((y + r) / TILE_SIZE), 0, mapRows - 1);
  for (let rr = r0; rr <= r1; rr++) {
    const line = tileMapData.tiles[rr] || "";
    for (let cc = c0; cc <= c1; cc++) {
      if (SOLID_CHARS.indexOf(line[cc] || ".") === -1) continue;
      if (
        circleRectCollision(
          x, y, r,
          cc * TILE_SIZE, rr * TILE_SIZE, TILE_SIZE, TILE_SIZE,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function buildVampGrid() {
  vampFree = null;
  if (!(tileMapData && tileMapData.tiles)) return;
  vampGridW = ceil(worldW / VAMP_GRID);
  vampGridH = ceil(worldH / VAMP_GRID);
  vampFree = new Uint8Array(vampGridW * vampGridH);
  const r = PLAYER_RADIUS;
  for (let gy = 0; gy < vampGridH; gy++) {
    for (let gx = 0; gx < vampGridW; gx++) {
      const x = gx * VAMP_GRID + VAMP_GRID / 2;
      const y = gy * VAMP_GRID + VAMP_GRID / 2;
      vampFree[gy * vampGridW + gx] = vampBodyFits(x, y, r) ? 1 : 0;
    }
  }
}

// A body standing in a legal spot doesn't necessarily sit on a free node —
// tile centres and node centres never coincide — so snap to the closest one
// rather than giving up and standing still.
function nearestFreeNode(x, y) {
  const gx = constrain(floor(x / VAMP_GRID), 0, vampGridW - 1);
  const gy = constrain(floor(y / VAMP_GRID), 0, vampGridH - 1);
  if (vampFree[gy * vampGridW + gx]) return gy * vampGridW + gx;
  for (let rad = 1; rad <= 4; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (max(abs(dx), abs(dy)) !== rad) continue;
        const nx = gx + dx,
          ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= vampGridW || ny >= vampGridH) continue;
        if (vampFree[ny * vampGridW + nx]) return ny * vampGridW + nx;
      }
    }
  }
  return -1;
}

function findVampPath(fromX, fromY, toX, toY) {
  if (!vampFree) return [];
  const start = nearestFreeNode(fromX, fromY);
  const goal = nearestFreeNode(toX, toY);
  if (start < 0 || goal < 0) return [];

  const n = vampGridW * vampGridH;
  const prev = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0,
    tail = 0,
    found = false;
  queue[tail++] = start;
  prev[start] = start;

  while (head < tail) {
    const cur = queue[head++];
    if (cur === goal) {
      found = true;
      break;
    }
    const cx = cur % vampGridW;
    const cy = (cur / vampGridW) | 0;
    if (cx > 0) {
      const k = cur - 1;
      if (vampFree[k] && prev[k] === -1) { prev[k] = cur; queue[tail++] = k; }
    }
    if (cx < vampGridW - 1) {
      const k = cur + 1;
      if (vampFree[k] && prev[k] === -1) { prev[k] = cur; queue[tail++] = k; }
    }
    if (cy > 0) {
      const k = cur - vampGridW;
      if (vampFree[k] && prev[k] === -1) { prev[k] = cur; queue[tail++] = k; }
    }
    if (cy < vampGridH - 1) {
      const k = cur + vampGridW;
      if (vampFree[k] && prev[k] === -1) { prev[k] = cur; queue[tail++] = k; }
    }
  }
  if (!found) return [];

  const path = [];
  let cur = goal;
  while (cur !== start) {
    path.push({
      x: (cur % vampGridW) * VAMP_GRID + VAMP_GRID / 2,
      y: ((cur / vampGridW) | 0) * VAMP_GRID + VAMP_GRID / 2,
    });
    cur = prev[cur];
  }
  return path.reverse();
}

function huntPlayer() {
  const step = PLAYER_SPEED * 0.7;

  // With nothing in the way it just walks at you, which looks better than
  // stepping between tile centres across an open room.
  if (hasClearLine(vampire.x, vampire.y, player.x, player.y)) {
    vampPath = [];
    const dx = player.x - vampire.x,
      dy = player.y - vampire.y;
    const d = sqrt(dx * dx + dy * dy);
    if (d > 0) moveVampire((dx / d) * step, (dy / d) * step);
    return;
  }

  // Otherwise follow the route. Repath on the timer, and immediately if the
  // route has run out — without that it beelines into a wall and sticks there.
  const now = millis();
  if (now >= vampRepathAt || !vampPath.length) {
    vampPath = findVampPath(vampire.x, vampire.y, player.x, player.y);
    vampRepathAt = now + VAMP_REPATH_MS;
  }
  while (
    vampPath.length &&
    dist(vampire.x, vampire.y, vampPath[0].x, vampPath[0].y) < VAMP_GRID * 0.6
  ) {
    vampPath.shift();
  }
  if (!vampPath.length) return;

  const dx = vampPath[0].x - vampire.x,
    dy = vampPath[0].y - vampire.y;
  const d = sqrt(dx * dx + dy * dy);
  if (d > 0) moveVampire((dx / d) * step, (dy / d) * step);
}

function hasClearLine(x1, y1, x2, y2) {
  for (let wall of walls) {
    if (isLineRectIntersecting(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

// Axis-separated like the player's own movement, so it slides along a wall
// rather than sticking to it.
function moveVampire(dx, dy) {
  if (!collidesWithWalls(vampire.x + dx, vampire.y, vampire.r)) vampire.x += dx;
  if (!collidesWithWalls(vampire.x, vampire.y + dy, vampire.r)) vampire.y += dy;
  vampire.x = constrain(vampire.x, vampire.r, worldW - vampire.r);
  vampire.y = constrain(vampire.y, vampire.r, worldH - vampire.r);
}

function checkVampireCatch() {
  if (dist(player.x, player.y, vampire.x, vampire.y) < 30) {
    startDeathCam();
  }
}

// The courtyard's standing water. It triggers on the tile under your feet —
// the player's centre — not on anything the hitbox merely brushes, so skirting
// the edge of a puddle is a real option rather than a coin flip.
function checkPuddleSlip() {
  if (koActive || millis() < koGraceUntil) return;
  if (!(tileMapData && tileMapData.tiles)) return;
  const col = floor(player.x / TILE_SIZE);
  const row = floor(player.y / TILE_SIZE);
  if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) return;
  const ch = (tileMapData.tiles[row] || "")[col] || ".";
  if (HAZARD_CHARS.indexOf(ch) !== -1) startKnockout();
}

function startKnockout() {
  koActive = true;
  koStart = millis();
  playOneShot(ringingSound, ringingReady, 0.5);
}

// While he is out: no input, no flashlight, and the vampire keeps coming.
// Handled here rather than in updatePlayer so the vampire still updates.
function updateKnockout() {
  if (koActive && millis() - koStart >= KO_MS) {
    koActive = false;
    koGraceUntil = millis() + KO_GRACE_MS;
  }
}

// Blown-out white on impact, dropping to a haze he comes round from, with
// rings washing out in time with the tone.
function drawKnockout() {
  if (!koActive) return;
  const t = constrain((millis() - koStart) / KO_MS, 0, 1);
  const a = t < 0.1 ? map(t, 0, 0.1, 255, 105) : map(t, 0.1, 1, 105, 0);

  push();
  noStroke();
  fill(255, 255, 255, a);
  rect(0, 0, width, height);

  noFill();
  for (let i = 0; i < 2; i++) {
    const rt = constrain(t * 1.5 - i * 0.3, 0, 1);
    if (rt <= 0 || rt >= 1) continue;
    stroke(255, 255, 255, 150 * (1 - rt));
    strokeWeight(2 + 6 * (1 - rt));
    ellipse(width / 2, height / 2, 120 + 900 * rt);
  }
  pop();
}

// Freeze on the moment, play it out, then hand off to the death screen.
function startDeathCam() {
  if (gameState === "dying") return;
  gameState = "dying";
  deathStart = millis();
  killPos = { vx: vampire.x, vy: vampire.y, px: player.x, py: player.y };
  playOneShot(gameoverSound, gameoverReady, 0.7); // quick lose sting
  // cut the ambient body/vampire audio for the kill
  try {
    if (whisperSound) whisperSound.setVolume(0);
  } catch (e) {}
  try {
    if (breathingSound) breathingSound.setVolume(0);
  } catch (e) {}
  breathingVol = 0;
}

function drawDeathCam() {
  let t = constrain((millis() - deathStart) / DEATH_CAM_MS, 0, 1);

  let sx = killPos.px - camera.x + shakeX;
  let sy = killPos.py - camera.y + shakeY;

  // Spotlight the kill: dark everywhere, clear around the grab point.
  let g = drawingContext.createRadialGradient(sx, sy, 20, sx, sy, 250);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(8,0,0,0.94)");
  drawingContext.save();
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();

  // red flash that builds
  noStroke();
  fill(120, 0, 0, 30 + 110 * t);
  rect(0, 0, width, height);

  push();
  translate(-camera.x + shakeX, -camera.y + shakeY);
  imageMode(CENTER);

  // player turns to face his attacker
  let pAngle = atan2(killPos.vy - killPos.py, killPos.vx - killPos.px);
  push();
  translate(killPos.px, killPos.py);
  rotate(pAngle);
  if (playerImg && playerImg.width)
    image(playerImg, 0, 0, PLAYER_RADIUS * 2.4, PLAYER_RADIUS * 2.4);
  else {
    fill(220);
    ellipse(0, 0, PLAYER_RADIUS * 2);
  }
  pop();

  // vampire lunges in and grows as he strikes
  let lx = lerp(killPos.vx, killPos.px, 0.5 * t);
  let ly = lerp(killPos.vy, killPos.py, 0.5 * t);
  let vAngle = atan2(killPos.py - killPos.vy, killPos.px - killPos.vx);
  let vs = 25 * 2.4 * (1 + 0.5 * t);
  push();
  translate(lx, ly);
  rotate(vAngle);
  if (vampireImg && vampireImg.width) image(vampireImg, 0, 0, vs, vs);
  else {
    fill(150, 20, 20);
    ellipse(0, 0, vs);
  }
  pop();
  pop();

  if (t >= 1) gameState = "gameover";
}

// ---------------------------------------------------------------------
//  DRAWING — WORLD
// ---------------------------------------------------------------------
// The map is wider than the canvas, so only walk the tiles the camera can
// actually see. Two tiles of margin covers the screen-shake offset.
function visibleTiles() {
  const m = 2;
  return {
    c0: max(0, floor(camera.x / TILE_SIZE) - m),
    c1: min(mapCols - 1, floor((camera.x + CANVAS_W) / TILE_SIZE) + m),
    r0: max(0, floor(camera.y / TILE_SIZE) - m),
    r1: min(mapRows - 1, floor((camera.y + CANVAS_H) / TILE_SIZE) + m),
  };
}

function drawRoom() {
  if (!(tileMapData && tileMapData.tiles)) return;

  const v = visibleTiles();
  for (let row = v.r0; row <= v.r1; row++) {
    let line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      let x = col * TILE_SIZE;
      let y = row * TILE_SIZE;
      if (tileFloorImg) image(tileFloorImg, x, y, TILE_SIZE, TILE_SIZE);

      let ch = line[col] || ".";
      let rotationAngle = 0;
      let isWall = false,
        isCorner = false;

      if (ch === "L" || ch === "B" || ch === "R" || ch === "U") {
        isWall = true;
        if (ch === "L") rotationAngle = 0;
        else if (ch === "U") rotationAngle = HALF_PI;
        else if (ch === "R") rotationAngle = PI;
        else if (ch === "B") rotationAngle = PI + HALF_PI;
      } else if (ch === "N" || ch === "E" || ch === "S" || ch === "W") {
        isCorner = true;
        if (ch === "N") rotationAngle = 0;
        else if (ch === "E") rotationAngle = HALF_PI;
        else if (ch === "S") rotationAngle = PI;
        else if (ch === "W") rotationAngle = PI + HALF_PI;
      } else if (ch === "C") {
        isCorner = true;
        rotationAngle = 0;
      }

      if (ch === "@") {
        drawAutoWall(col, row, x, y);
      } else if (isWall) {
        drawTile(tileWallImg, x, y, rotationAngle, color(100, 100, 170));
      } else if (isCorner) {
        drawTile(tileCornerImg, x, y, rotationAngle, color(140, 120, 200));
      } else if (ch === ",") {
        drawTile(cyMossImg, x, y, 0, color(70, 96, 52));
      } else if (ch === "i") {
        drawTile(cyIvyImg, x, y, 0, color(52, 92, 44));
      } else if (ch === "*") {
        // Rotated per-tile so a scattering of puddles doesn't look stamped.
        drawTile(
          puddleImg,
          x,
          y,
          ((col * 7 + row * 13) % 4) * HALF_PI,
          color(46, 120, 140),
        );
      } else if (ch === "X") {
        drawTile(gateImg, x, y, 0, color(90, 58, 30));
      } else if (drawPropTile(ch, x, y)) {
        // furniture and scenery — drawFurniture() redraws these lit
      } else if (ch === "1") {
        drawTile(carpetCornerImg, x, y, 0, color(120, 40, 40));
      } else if (ch === "4") {
        drawTile(carpetCornerImg, x, y, HALF_PI, color(120, 40, 40));
      } else if (ch === "5") {
        drawTile(carpetCornerImg, x, y, PI, color(120, 40, 40));
      } else if (ch === "6") {
        drawTile(carpetCornerImg, x, y, PI + HALF_PI, color(120, 40, 40));
      } else if (ch === "2") {
        drawTile(carpetMiddleImg, x, y, 0, color(120, 40, 40));
      } else if (ch === "3") {
        // carpettop, 0° — top edge, no rotation
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "7") {
        // carpettop, HALF_PI — right edge, rotated 90° clockwise
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(HALF_PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "8") {
        // carpettop, PI — bottom edge, rotated 180°
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      } else if (ch === "9") {
        // carpettop, PI + HALF_PI — left edge, rotated 270°
        push();
        translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        rotate(PI + HALF_PI);
        if (carpetTopImg && carpetTopImg.width) {
          image(
            carpetTopImg,
            -TILE_SIZE / 2,
            -TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
        } else {
          noStroke();
          fill(120, 40, 40);
          rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
        pop();
      }
    }
  }
}

// The lit pass over furniture and scenery. drawRoom() has already laid these
// down under the darkness as silhouettes; this repaints the ones the beam is
// actually on, at full brightness, above the overlay — so the occlusion
// boundary never shadows a sprite into a black cut-out at the cone's edge.
//
// Skipped during the tutorial: that room is built procedurally and has its own
// furniture, while tileMapData still points at the mansion. Without this guard
// the mansion's tables get painted at mansion coordinates inside the tutorial
// room, where nothing is solid, and you can walk straight through them.
function drawFurniture() {
  if (gameState === "tutorial") return;
  if (!(tileMapData && tileMapData.tiles)) return;

  const v = visibleTiles();
  for (let row = v.r0; row <= v.r1; row++) {
    let line = tileMapData.tiles[row] || "";
    for (let col = v.c0; col <= v.c1; col++) {
      let x = col * TILE_SIZE;
      let y = row * TILE_SIZE;
      let ch = line[col] || ".";

      if ("TDHGk#%~opqv".indexOf(ch) === -1) continue;

      if (!isInFlashlight(x + TILE_SIZE / 2, y + TILE_SIZE / 2, { x, y }))
        continue;

      drawPropTile(ch, x, y);
    }
  }
}

// Everything that sits on the floor rather than being part of it: the
// mansion's furniture and the courtyard's scenery.
//
// These are drawn twice. Once by drawRoom() underneath the darkness, which
// leaves a faint silhouette you can make out before you walk into it, and
// again by drawFurniture() once the beam reaches them, which lights them
// properly instead of leaving the black cut-out that a bare wall becomes.
// The under-darkness pass matters: every one of these blocks movement, so
// without it a table in an unlit room is an invisible wall.
//
// Returns false for anything it doesn't handle, so callers can chain on it.
function drawPropTile(ch, x, y) {
  if (ch === "T") drawTile(tableImg, x, y, 0, color(139, 90, 43));
  else if (ch === "D") drawTile(dinnertableImg, x, y, 0, color(101, 67, 33));
  else if (ch === "H") drawTile(chairbackImg, x, y, 0, color(90, 60, 40));
  else if (ch === "G") drawTile(signImg, x, y, 0, color(120, 100, 60));
  else if (ch === "k") drawTile(crateImg, x, y, 0, color(120, 76, 40));
  else if (ch === "#") drawTile(hedgeImg, x, y, 0, color(40, 84, 34));
  else if (ch === "%") drawTile(flowerBushImg, x, y, 0, color(48, 96, 40));
  else if (ch === "~") drawTile(poolImg, x, y, 0, color(30, 100, 118));
  // One quarter-tile rotated four ways makes the 2x2 well.
  else if (ch === "o") drawTile(wellImg, x, y, 0, color(120, 124, 120));
  else if (ch === "p") drawTile(wellImg, x, y, HALF_PI, color(120, 124, 120));
  else if (ch === "q") drawTile(wellImg, x, y, PI, color(120, 124, 120));
  else if (ch === "v")
    drawTile(wellImg, x, y, PI + HALF_PI, color(120, 124, 120));
  else return false;
  return true;
}

// Pick the wall piece that matches which of the four neighbours are also wall.
// Rotations are measured off how the art was drawn: the corner joins right and
// down at 0, and the tee's stem points right at 0.
function autoWallPiece(up, right, down, left) {
  const n = (up ? 1 : 0) + (right ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0);

  if (n === 4) return { img: wallPlusImg, rot: 0 };

  if (n === 3) {
    if (!left) return { img: wallTeeImg, rot: 0 };
    if (!up) return { img: wallTeeImg, rot: HALF_PI };
    if (!right) return { img: wallTeeImg, rot: PI };
    return { img: wallTeeImg, rot: PI + HALF_PI };
  }

  if (n === 2) {
    if (up && down) return { img: wallVerticalImg, rot: 0 };
    if (left && right) return { img: wallHorizontalImg, rot: 0 };
    if (right && down) return { img: wallCornerImg, rot: 0 };
    if (down && left) return { img: wallCornerImg, rot: HALF_PI };
    if (left && up) return { img: wallCornerImg, rot: PI };
    return { img: wallCornerImg, rot: PI + HALF_PI }; // up && right
  }

  // A stub or a lone pillar: run it along whichever axis it connects on.
  if (up || down) return { img: wallVerticalImg, rot: 0 };
  return { img: wallHorizontalImg, rot: 0 };
}

// Anything off the edge of the map counts as open, so the outer wall of a room
// reads as a proper corner instead of sprouting arms into the void.
function isAutoWall(col, row) {
  if (!(tileMapData && tileMapData.tiles)) return false;
  if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) return false;
  return ((tileMapData.tiles[row] || "")[col] || ".") === "@";
}

function drawAutoWall(col, row, x, y) {
  const p = autoWallPiece(
    isAutoWall(col, row - 1),
    isAutoWall(col + 1, row),
    isAutoWall(col, row + 1),
    isAutoWall(col - 1, row),
  );
  drawTile(p.img, x, y, p.rot, color(100, 100, 170));
}

function drawTile(img, x, y, rotationAngle, fallback) {
  push();
  translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
  if (rotationAngle) rotate(rotationAngle);
  if (img && img.width) {
    image(img, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  } else {
    noStroke();
    fill(fallback);
    rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  }
  pop();
}

function drawTutorialRoom() {
  const rx = 100,
    ry = 140;
  const cols = 15,
    rows = 13;

  // Same wall test the layout above is built from, so the auto-tiler can ask
  // about neighbours that fall outside the room.
  const wallAt = (c, r) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    // The doorway out. Must match the opening initTutorial() leaves in the
    // collision walls exactly — the door is two tiles tall at rows 5 and 6, so
    // row 7 is solid wall. Skipping it here too left a hole under the door.
    if (c === cols - 1) return !(r >= 5 && r <= 6);
    return r === 0 || r === rows - 1 || c === 0;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = rx + col * TILE_SIZE;
      let y = ry + row * TILE_SIZE;
      if (tileFloorImg) image(tileFloorImg, x, y, TILE_SIZE, TILE_SIZE);

      if (wallAt(col, row)) {
        const p = autoWallPiece(
          wallAt(col, row - 1),
          wallAt(col + 1, row),
          wallAt(col, row + 1),
          wallAt(col - 1, row),
        );
        drawTile(p.img, x, y, p.rot, color(100, 100, 170));
      }
    }
  }
  for (let tbl of tables)
    drawTile(tableImg, tbl.x, tbl.y, 0, color(139, 90, 43));
}

function drawKey() {
  if (keyItem.collected) return;
  if (!isInFlashlight(keyItem.x, keyItem.y)) return;
  push();
  translate(keyItem.x, keyItem.y);
  // soft pulsing glow so it stands out when the beam sweeps over it
  noStroke();
  let pulse = 0.5 + 0.5 * sin(millis() / 250);
  fill(255, 220, 90, 55 + 55 * pulse);
  ellipse(0, 0, 72 + 12 * pulse);
  imageMode(CENTER);
  if (keyImg && keyImg.width) image(keyImg, 0, 0, 58, 58);
  else {
    fill(240, 210, 80);
    ellipse(0, 0, 42);
  }
  pop();
}

function drawDoor() {
  push();
  let pulse = 0.5 + 0.5 * sin(millis() / 300);

  // Glow aura so the exit is obvious from across the room.
  noStroke();
  if (door.isOpen) fill(70, 220, 130, 70 + 70 * pulse);
  else fill(220, 60, 60, 70 + 70 * pulse);
  rect(door.x - 10, door.y - 10, door.w + 20, door.h + 20, 10);

  if (doorLeafImg && doorLeafImg.width) {
    // The leaf is drawn upright — planks vertical, knob on its right edge — but
    // every doorway in the game is a tall gap in a side wall, so each leaf gets
    // laid on its side. Turning it a quarter clockwise puts the knob on the
    // leaf's lower edge; mirroring that for the second leaf puts its knob on its
    // upper edge, so the two knobs meet on the join in the middle of the opening.
    const half = door.h / 2;
    const cx = door.x + door.w / 2;

    push();
    imageMode(CENTER);
    // Rotated, so the image's width runs down the opening and its height across.
    push();
    translate(cx, door.y + half / 2);
    rotate(HALF_PI);
    image(doorLeafImg, 0, 0, half, door.w);
    pop();

    push();
    translate(cx, door.y + half + half / 2);
    scale(1, -1); // mirror of the upper leaf, so it reads as a matched pair
    rotate(HALF_PI);
    image(doorLeafImg, 0, 0, half, door.w);
    pop();
    pop();

    // tint shows locked (red) vs unlocked (green)
    noStroke();
    if (door.isOpen) fill(60, 230, 120, 60);
    else fill(220, 50, 50, 75);
    rect(door.x, door.y, door.w, door.h);
  } else {
    fill(door.isOpen ? color(80, 200, 120) : color(200, 80, 80));
    rect(door.x, door.y, door.w, door.h, 4);
    if (!door.isOpen) {
      fill(120);
      rect(door.x + 8, door.y + door.h / 2, 8, 36, 4);
    }
  }
  pop();
}

function drawPlayer() {
  let angle = atan2(mouseY + camera.y - player.y, mouseX + camera.x - player.x);
  imageMode(CENTER);
  push();
  translate(player.x, player.y);
  rotate(angle);
  if (playerImg && playerImg.width)
    image(playerImg, 0, 0, player.r * 2.4, player.r * 2.4);
  else {
    noStroke();
    fill(220);
    ellipse(0, 0, player.r * 2);
  }
  pop();
}

function drawVampire() {
  if (!isInFlashlight(vampire.x, vampire.y)) return;
  let angle = atan2(player.y - vampire.y, player.x - vampire.x);
  imageMode(CENTER);
  push();
  translate(vampire.x, vampire.y);
  rotate(angle);
  if (vampireImg && vampireImg.width)
    image(vampireImg, 0, 0, vampire.r * 2.4, vampire.r * 2.4);
  else {
    noStroke();
    fill(150, 20, 20);
    ellipse(0, 0, vampire.r * 2);
  }
  pop();
}

// ---------------------------------------------------------------------
//  LIGHTING (smooth, corner-aware visibility polygon + soft edge)
// ---------------------------------------------------------------------
// Walls close enough to cast a shadow this frame. Rebuilt once per frame and
// shared by the darkness overlay and by every isInFlashlight() test, which
// would otherwise each walk the whole wall list — that adds up fast in the
// courtyard, where a few hundred hedge tiles are all occluders.
let frameOccluders = [];

function getNearbyOccluders() {
  let list = [];
  let range = FLASHLIGHT_DISTANCE + TILE_SIZE;
  for (let w of walls) {
    let nx = constrain(player.x, w.x, w.x + w.w);
    let ny = constrain(player.y, w.y, w.y + w.h);
    if (dist(player.x, player.y, nx, ny) <= range) list.push(w);
  }
  if (!door.isOpen) {
    let nx = constrain(player.x, door.x, door.x + door.w);
    let ny = constrain(player.y, door.y, door.y + door.h);
    if (dist(player.x, player.y, nx, ny) <= range) list.push(door);
  }
  return list;
}

// Sample angles (relative to aim direction) — a smooth fan plus rays aimed
// just past every nearby corner so the light wraps tightly around desks.
function buildLightDeltas(cx, cy, targetAngle, occluders) {
  let half = FLASHLIGHT_ANGLE / 2;
  let deltas = [-half, half];

  const fan = 56;
  for (let i = 0; i <= fan; i++)
    deltas.push(-half + FLASHLIGHT_ANGLE * (i / fan));

  const eps = 0.0009;
  for (let o of occluders) {
    let corners = [
      [o.x, o.y],
      [o.x + o.w, o.y],
      [o.x, o.y + o.h],
      [o.x + o.w, o.y + o.h],
    ];
    for (let c of corners) {
      if (dist(cx, cy, c[0], c[1]) > FLASHLIGHT_DISTANCE + 4) continue;
      let d = angleDifference(atan2(c[1] - cy, c[0] - cx), targetAngle);
      if (d < -half - 0.02 || d > half + 0.02) continue;
      deltas.push(constrain(d, -half, half));
      deltas.push(constrain(d - eps, -half, half));
      deltas.push(constrain(d + eps, -half, half));
    }
  }
  deltas.sort((a, b) => a - b);
  return deltas;
}

function drawFog() {
  let overlay = drawDarknessOverlay();
  if (overlay) drawFlashlightGlow(overlay.pts, overlay.cx, overlay.cy);
}

function drawDarknessOverlay() {
  let cxw = player.x,
    cyw = player.y;
  let targetAngle = atan2(mouseY + camera.y - cyw, mouseX + camera.x - cxw);

  // Darker ambient overall. This stays constant during a flicker so only the
  // flashlight beam drops out — the room doesn't go pitch black.
  const FOG_ALPHA = 236;

  fogLayer.clear();
  fogLayer.noStroke();
  fogLayer.fill(0, FOG_ALPHA);
  fogLayer.rect(0, 0, CANVAS_W, CANVAS_H);

  if (!lightOn) {
    image(fogLayer, 0, 0); // beam flickered off — ambient unchanged
    return null;
  }

  let occ = frameOccluders;
  let deltas = buildLightDeltas(cxw, cyw, targetAngle, occ);

  let pts = [];
  for (let d of deltas) {
    let p = traceRay(cxw, cyw, targetAngle + d, occ);
    pts.push({ x: p.x - camera.x, y: p.y - camera.y });
  }
  let cx = cxw - camera.x,
    cy = cyw - camera.y;

  // Carve the lit cone out of the fog with a soft feathered edge (wrap light).
  let ctx = fogLayer.drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.filter = "blur(5px)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let p of pts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  image(fogLayer, 0, 0);

  return { pts, cx, cy };
}

function drawFlashlightGlow(pts, cx, cy) {
  // Warm radial glow clipped to the same polygon.
  let g = drawingContext.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    FLASHLIGHT_DISTANCE,
  );
  g.addColorStop(0, "rgba(255, 226, 150, 0.22)");
  g.addColorStop(0.5, "rgba(255, 210, 120, 0.10)");
  g.addColorStop(1, "rgba(255, 200, 100, 0.0)");
  drawingContext.save();
  drawingContext.fillStyle = g;
  drawingContext.beginPath();
  drawingContext.moveTo(cx, cy);
  for (let p of pts) drawingContext.lineTo(p.x, p.y);
  drawingContext.closePath();
  drawingContext.fill();
  drawingContext.restore();
}

function traceRay(startX, startY, angle, occluders) {
  let rayX = cos(angle),
    rayY = sin(angle);
  let closestDist = FLASHLIGHT_DISTANCE;
  let list = occluders || walls;
  for (let wall of list) {
    let hit = rayAABBIntersection(startX, startY, rayX, rayY, wall);
    if (hit && hit.dist < closestDist) closestDist = hit.dist;
  }
  return { x: startX + rayX * closestDist, y: startY + rayY * closestDist };
}

function rayAABBIntersection(startX, startY, dirX, dirY, wall) {
  let tMin = 0,
    tMax = FLASHLIGHT_DISTANCE;
  if (abs(dirX) > 0.001) {
    let t1 = (wall.x - startX) / dirX;
    let t2 = (wall.x + wall.w - startX) / dirX;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = max(tMin, t1);
    tMax = min(tMax, t2);
  } else if (startX < wall.x || startX > wall.x + wall.w) {
    return null;
  }
  if (abs(dirY) > 0.001) {
    let t1 = (wall.y - startY) / dirY;
    let t2 = (wall.y + wall.h - startY) / dirY;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = max(tMin, t1);
    tMax = min(tMax, t2);
  } else if (startY < wall.y || startY > wall.y + wall.h) {
    return null;
  }
  if (tMin <= tMax && tMin > 0.1) return { dist: tMin };
  return null;
}

function isInFlashlight(x, y, excludeWall) {
  if (!lightOn) return false;
  let targetAngle = atan2(
    mouseY + camera.y - player.y,
    mouseX + camera.x - player.x,
  );
  let pointAngle = atan2(y - player.y, x - player.x);
  let angleDiff = abs(angleDifference(pointAngle, targetAngle));
  let distance = dist(player.x, player.y, x, y);
  if (distance >= FLASHLIGHT_DISTANCE || angleDiff >= FLASHLIGHT_ANGLE / 2)
    return false;

  // Only walls near enough to matter — see frameOccluders above.
  const list = frameOccluders.length ? frameOccluders : walls;
  for (let wall of list) {
    // A solid occluder checking its own visibility would otherwise always
    // block itself, since the test point sits at its own tile's center.
    if (excludeWall && wall.x === excludeWall.x && wall.y === excludeWall.y)
      continue;
    if (isLineRectIntersecting(player.x, player.y, x, y, wall)) return false;
  }
  if (!door.isOpen && isLineRectIntersecting(player.x, player.y, x, y, door))
    return false;
  return true;
}

function isLineRectIntersecting(x1, y1, x2, y2, wall) {
  if (lineIntersect(x1, y1, x2, y2, wall.x, wall.y, wall.x + wall.w, wall.y))
    return true;
  if (
    lineIntersect(
      x1,
      y1,
      x2,
      y2,
      wall.x,
      wall.y + wall.h,
      wall.x + wall.w,
      wall.y + wall.h,
    )
  )
    return true;
  if (lineIntersect(x1, y1, x2, y2, wall.x, wall.y, wall.x, wall.y + wall.h))
    return true;
  if (
    lineIntersect(
      x1,
      y1,
      x2,
      y2,
      wall.x + wall.w,
      wall.y,
      wall.x + wall.w,
      wall.y + wall.h,
    )
  )
    return true;
  if (
    x1 >= wall.x &&
    x1 <= wall.x + wall.w &&
    y1 >= wall.y &&
    y1 <= wall.y + wall.h
  )
    return true;
  if (
    x2 >= wall.x &&
    x2 <= wall.x + wall.w &&
    y2 >= wall.y &&
    y2 <= wall.y + wall.h
  )
    return true;
  return false;
}

function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  let denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (abs(denom) < 0.0001) return false;
  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff < -PI) diff += TWO_PI;
  while (diff > PI) diff -= TWO_PI;
  return diff;
}

// ---------------------------------------------------------------------
//  SCREENS / UI
// ---------------------------------------------------------------------
function drawStartScreen() {
  background(0);
  // faint blood-mist vignette
  noStroke();
  for (let i = 0; i < 3; i++) {
    fill(40 + i * 10, 0, 0, 18);
    ellipse(width / 2, height / 2 - 40, 700 - i * 140, 460 - i * 90);
  }

  textAlign(CENTER, CENTER);

  // Title — large red vampire font, sized to fit
  textFont(TITLE_FONT);
  let size = 100;
  textSize(size);
  while (textWidth("HEAR NO EVIL") > width - 70 && size > 40) {
    size -= 2;
    textSize(size);
  }
  fill(35, 0, 0);
  text("HEAR NO EVIL", width / 2 + 5, height / 2 - 86 + 5);
  fill(170, 14, 14);
  text("HEAR NO EVIL", width / 2, height / 2 - 86);

  textFont("monospace");
  fill(150, 30, 30);
  textSize(16);
  text("you cannot hear what hunts you", width / 2, height / 2 - 6);

  let a = 150 + 105 * sin(millis() / 400);
  fill(220, 220, 220, a);
  textSize(22);
  text("press SPACE to begin", width / 2, height / 2 + 70);
  textAlign(LEFT, BASELINE);
}

function drawTutorialIntro() {
  push();
  noStroke();
  fill(0, 150);
  rect(0, 0, width, height);

  let bw = 600,
    bh = 240;
  let bx = width / 2 - bw / 2,
    by = height / 2 - bh / 2;
  fill(45);
  stroke(95);
  strokeWeight(2);
  rect(bx, by, bw, bh, 10);
  noStroke();

  textAlign(CENTER, CENTER);
  textFont("monospace");
  fill(255);
  textSize(25);
  text("Find the key to escape", width / 2, by + 58);
  text("and remember to watch your back", width / 2, by + 94);

  fill(190);
  textSize(15);
  text(
    "WASD to move   •   move your cursor to aim the light",
    width / 2,
    by + 150,
  );

  let a = 150 + 105 * sin(millis() / 400);
  fill(215, 215, 215, a);
  text("press SPACE or click to continue", width / 2, by + 195);
  pop();
  textAlign(LEFT, BASELINE);
}

function drawTutorialUI() {
  if (!tutorialIntroDismissed) return;
  noStroke();
  textFont("monospace");
  fill(255, 210);
  textSize(22);
  textAlign(CENTER, BASELINE);
  text("WASD to move and cursor to see", width / 2, height - 26);
  textAlign(LEFT, BASELINE);
}

function drawUI() {
  noStroke();
  textFont("monospace");
  fill(240);
  textSize(16);
  textAlign(LEFT, BASELINE);
  text("Move: WASD / Arrows", 18, 28);
  text("Look: cursor", 18, 50);

  fill(190, 190, 200);
  textSize(14);
  textAlign(CENTER, BASELINE);
  text(
    LEVELS[currentLevel].name + "  —  " + (currentLevel + 1) + "/" + LEVELS.length,
    width / 2,
    28,
  );
  textSize(16);
  fill(240);

  textAlign(RIGHT, BASELINE);
  if (player.hasKey) {
    fill(120, 220, 120);
    text("Key: obtained", width - 18, 28);
  } else {
    fill(220, 120, 120);
    text("Key: missing", width - 18, 28);
  }

  fill(255, 200);
  textAlign(CENTER, BASELINE);
  textSize(14);
  if (currentLevel === 1 && !player.hasKey)
    // nudged right, like the line below, so it clears the mini-map
    text(
      "Watch your footing — standing water will knock you out cold.",
      width / 2 + 60,
      height - 24,
    );
  else if (!player.hasKey)
    text(
      "The locked door glows red until you find the key.",
      width / 2 + 20,
      height - 24,
    );
  else if (currentLevel < LEVELS.length - 1)
    text(
      "Door unlocked — slip through the green opening into the courtyard.",
      width / 2,
      height - 24,
    );
  else
    text(
      "Door unlocked — slip through the green opening to escape.",
      width / 2,
      height - 24,
    );
  textAlign(LEFT, BASELINE);
}

function drawWinScreen() {
  push();
  fill(0, 200);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  fill(220);
  textFont(TITLE_FONT);
  textSize(64);
  text("You Escaped", width / 2, height / 2 - 20);
  textFont("monospace");
  fill(255);
  textSize(20);
  text("Press R to play again", width / 2, height / 2 + 50);
  pop();
  textAlign(LEFT, BASELINE);
}

function drawGameOverScreen() {
  push();
  if (deathImg && deathImg.width) {
    imageMode(CORNER);
    image(deathImg, 0, 0, width, height);
  }
  noStroke();
  fill(0, 160);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(190, 25, 25);
  textFont(TITLE_FONT);
  textSize(64);
  text("You Were Caught", width / 2, height / 2 - 20);
  textFont("monospace");
  fill(255);
  textSize(20);
  text("Press R to try again", width / 2, height / 2 + 50);
  pop();
  textAlign(LEFT, BASELINE);
}

// ---------------------------------------------------------------------
//  TRANSITION (smooth room-to-room fade)
// ---------------------------------------------------------------------
function checkTutorialCompletion() {
  if (fadeActive || !player.hasKey) return;
  if (
    player.x > door.x &&
    player.y > door.y - player.r &&
    player.y < door.y + door.h + player.r
  ) {
    startFade(() => initGame(0));
  }
}

function startFade(cb) {
  fadeActive = true;
  fadePhase = "out";
  fadeAlpha = 0;
  fadeCallback = cb;
}

function drawFade() {
  if (!fadeActive) return;
  if (fadePhase === "out") {
    fadeAlpha += 12;
    if (fadeAlpha >= 255) {
      fadeAlpha = 255;
      if (fadeCallback) {
        fadeCallback();
        fadeCallback = null;
      }
      fadePhase = "in";
    }
  } else if (fadePhase === "in") {
    fadeAlpha -= 12;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeActive = false;
      fadePhase = "";
    }
  }
  push();
  noStroke();
  fill(0, fadeAlpha);
  rect(0, 0, width, height);
  pop();
}

// ---------------------------------------------------------------------
//  INPUT
// ---------------------------------------------------------------------
function handleAdvance() {
  if (gameState === "start") {
    startAudio();
    initTutorial();
    return;
  }
  if (gameState === "tutorial" && !tutorialIntroDismissed) {
    tutorialIntroDismissed = true;
    return;
  }
}

function keyPressed() {
  if (key && key.length === 1) pressedKeys[key] = true;
  if (key === " " || keyCode === 32) handleAdvance();
  if (
    (key === "r" || key === "R") &&
    (gameState === "win" || gameState === "gameover")
  )
    restartGame();
}

function keyReleased() {
  if (key && key.length === 1) pressedKeys[key] = false;
}

function mousePressed() {
  handleAdvance();
}
