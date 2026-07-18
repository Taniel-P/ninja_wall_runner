export type Platform = { x: number; y: number; w: number; h: number };

export type ThemeGroup = 'forest' | 'city' | 'mountain' | 'temple';

export type Level = {
  id: number; // 1-20, overall position in the game
  group: ThemeGroup;
  groupLevelNumber: number; // 1-5, position within its theme group
  width: number;
  height: number;
  platforms: Platform[];
  goal: { x: number; y: number; r: number };
  playerStart: { x: number; y: number };
};

// Each theme group is 5 levels. Only Group 1 (forest) is built so far -
// city/mountain/temple groups will be added the same way, each with their
// own renderer once that art theme exists.
export const LEVELS: Level[] = [
  {
    id: 1,
    group: 'forest',
    groupLevelNumber: 1,
    width: 480,
    height: 2910,
    playerStart: { x: 220, y: 2710 },
    // Chamber layout tuned against the jump/wall-jump/double-jump physics so
    // each technique is the *only* way through its chamber:
    //   - a wall jump alone clears ~200px of rise; a double jump chained
    //     onto it clears ~370px total, so any gap taller than ~210px forces
    //     a double jump
    //   - a wall-jump kick carries ~240px sideways across a corridor when
    //     the player holds the direction, which is why the standard shaft
    //     corridor is 240px wide (tighter shafts use 220px for a
    //     faster-paced feel)
    //   - double-jump landings are wide "islands" grabbable from the side
    //     as a wall, not thin floors - a thin floor positioned right in the
    //     ascent path gets bonked on its underside instead of landed on,
    //     since the player is still rising when they reach it
    platforms: [
      { x: 0, y: 2830, w: 480, h: 80 }, // ground

      // Chapter 1 - Wall-Jump Primer: alternating pillars, plain wall jumps only.
      { x: 0, y: 2650, w: 120, h: 180 },
      { x: 360, y: 2500, w: 120, h: 180 },
      { x: 0, y: 2350, w: 120, h: 180 },
      { x: 360, y: 2200, w: 120, h: 180 },

      // Chapter 2 - Double-Jump Chasm: no walls, a wall jump alone falls short
      // of this island - only a double jump chained onto it gets you there.
      { x: 6, y: 2050, w: 140, h: 180 },

      // Chapter 3 - Wall + Double-Jump Combo: a single lone wall, then a
      // double jump off it to reach an island no plain wall jump can touch.
      { x: 0, y: 1870, w: 120, h: 180 },
      { x: 6, y: 1720, w: 140, h: 180 },

      // Chapter 4 - Chained shaft with a double-jump rescue: the first gap
      // demands a wall-jump + double-jump, then the shaft reverts to plain
      // chained wall jumps for the rest of the climb.
      { x: 0, y: 1540, w: 120, h: 180 },
      { x: 360, y: 1300, w: 120, h: 280 },
      { x: 0, y: 1250, w: 120, h: 180 },
      { x: 360, y: 1100, w: 120, h: 180 },

      // Chapter 5 - Open-air breather: small precision hops, no forced tech.
      { x: 150, y: 1100, w: 180, h: 30 },
      { x: 280, y: 930, w: 150, h: 30 },

      // Chapter 6 - Tall chained wall-jump shaft: four pillars, tighter 220px
      // corridor, purely to reward fast, confident chaining.
      { x: 350, y: 750, w: 130, h: 150 },
      { x: 0, y: 610, w: 130, h: 150 },
      { x: 350, y: 470, w: 130, h: 150 },
      { x: 0, y: 330, w: 130, h: 150 },

      // Chapter 7 - Grand finale combo: wall jump + double jump straight to the summit.
      { x: 170, y: 150, w: 140, h: 180 },
    ],
    goal: { x: 240, y: 80, r: 24 },
  },
  {
    id: 2,
    group: 'forest',
    groupLevelNumber: 2,
    width: 480,
    height: 2710,
    playerStart: { x: 220, y: 2510 },
    // "Twin Shafts": a longer wall-jump marathon than Level 1, then a NEW
    // pattern - alternating wall/island combo jumps chained back-to-back,
    // so the double jump gets refreshed and used every single hop instead
    // of once per chapter.
    platforms: [
      { x: 0, y: 2630, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (3 pillars).
      { x: 0, y: 2450, w: 120, h: 180 },
      { x: 360, y: 2300, w: 120, h: 180 },
      { x: 0, y: 2150, w: 120, h: 180 },

      // Chapter 2 - endurance marathon: six more pillars in a row (nine
      // total from the start of the level), purely testing sustained,
      // confident chaining rather than solving a puzzle.
      { x: 360, y: 2000, w: 120, h: 180 },
      { x: 0, y: 1850, w: 120, h: 180 },
      { x: 360, y: 1700, w: 120, h: 180 },
      { x: 0, y: 1550, w: 120, h: 180 },
      { x: 360, y: 1400, w: 120, h: 180 },
      { x: 0, y: 1250, w: 120, h: 180 },

      // Chapter 3 - wall/island combo chain: wall -> double-jump to an
      // island -> short hop to the next wall -> double-jump again, three
      // times over. Every hop refreshes and spends the double jump.
      { x: 340, y: 1110, w: 140, h: 180 },
      { x: 360, y: 930, w: 120, h: 180 },
      { x: 6, y: 790, w: 140, h: 180 },
      { x: 0, y: 610, w: 120, h: 180 },
      { x: 340, y: 470, w: 140, h: 180 },

      // Chapter 4 - finale combo to the summit.
      { x: 360, y: 290, w: 120, h: 180 },
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 3,
    group: 'forest',
    groupLevelNumber: 3,
    width: 480,
    height: 2630,
    playerStart: { x: 220, y: 2430 },
    // "Stepping on Air": the centerpiece is a pure double-jump island chain
    // - floor to floor, no walls at all, zig-zagging across open air - since
    // landing on an island's top refreshes the double jump exactly like
    // landing on the ground does. Ends with a signature maximum-distance
    // leap, the widest gap in the forest group.
    platforms: [
      { x: 0, y: 2550, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (2 pillars).
      { x: 0, y: 2370, w: 120, h: 180 },
      { x: 360, y: 2220, w: 120, h: 180 },

      // Chapter 2 - pure double-jump island chain: floor-launched combo
      // jumps only, zig-zagging left/right across open air with no walls.
      { x: 0, y: 2070, w: 120, h: 180 },
      { x: 340, y: 1930, w: 140, h: 180 },
      { x: 80, y: 1590, w: 160, h: 180 },
      { x: 330, y: 1250, w: 150, h: 180 },
      { x: 60, y: 910, w: 160, h: 180 },

      // Chapter 3 - short wall-jump interlude (breather between aerial sections).
      { x: 360, y: 760, w: 120, h: 180 },
      { x: 0, y: 610, w: 120, h: 180 },

      // Chapter 4 - the signature maximum-distance leap: a wall-jump +
      // double-jump combo across the widest gap in the forest group.
      { x: 280, y: 440, w: 200, h: 180 },

      // Chapter 5 - finale combo to the summit.
      { x: 0, y: 290, w: 120, h: 180 },
      { x: 180, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 270, y: 80, r: 24 },
  },
  {
    id: 4,
    group: 'forest',
    groupLevelNumber: 4,
    width: 480,
    height: 2590,
    playerStart: { x: 220, y: 2390 },
    // "Zigzag Ascent": corridors change width shaft to shaft (and even
    // pillar to pillar within Chapter 3) - 220px, 240px, and 260px all
    // appear, so the player has to read each gap rather than settling into
    // one fixed rhythm. Chapter 5 narrows the pillars themselves for a
    // precision finish.
    platforms: [
      { x: 0, y: 2510, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (240px corridor, 2 pillars).
      { x: 0, y: 2330, w: 120, h: 180 },
      { x: 360, y: 2180, w: 120, h: 180 },

      // Chapter 2 - tight 220px corridor, lighter pillars, 5 in a row.
      { x: 0, y: 2030, w: 120, h: 180 },
      { x: 350, y: 1890, w: 130, h: 150 },
      { x: 0, y: 1750, w: 130, h: 150 },
      { x: 350, y: 1610, w: 130, h: 150 },
      { x: 0, y: 1470, w: 130, h: 150 },
      { x: 350, y: 1330, w: 130, h: 150 },

      // Chapter 3 - alternating width: 220, 240, 220, 240. Same vertical
      // step throughout, so only the horizontal commitment changes.
      { x: 0, y: 1190, w: 130, h: 150 },
      { x: 370, y: 1050, w: 110, h: 150 },
      { x: 0, y: 910, w: 150, h: 150 },
      { x: 390, y: 770, w: 90, h: 150 },

      // Chapter 4 - double-jump combo interlude for pacing.
      { x: 80, y: 600, w: 170, h: 180 },

      // Chapter 5 - narrower precision pillars, still a 220px corridor.
      { x: 0, y: 460, w: 110, h: 150 },
      { x: 330, y: 320, w: 150, h: 150 },

      // Chapter 6 - finale combo to the summit.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 5,
    group: 'forest',
    groupLevelNumber: 5,
    width: 480,
    height: 3890,
    playerStart: { x: 220, y: 3690 },
    // "Trial of the Grove": the forest group's finale - a tour through
    // every technique introduced across Levels 1-4 (double-jump chasm,
    // wall+combo tower, alternating-width shaft, double-jump rescue,
    // pure island chain, endurance marathon) back to back, capped with the
    // tallest, most demanding climb in the group.
    platforms: [
      { x: 0, y: 3810, w: 480, h: 80 }, // ground

      // Chapter 1 - primer (3 pillars).
      { x: 0, y: 3630, w: 120, h: 180 },
      { x: 360, y: 3480, w: 120, h: 180 },
      { x: 0, y: 3330, w: 120, h: 180 },

      // Chapter 2 - double-jump chasm (Level 1's opening trick).
      { x: 340, y: 3190, w: 140, h: 180 },

      // Chapter 3 - wall + double-jump combo tower.
      { x: 360, y: 3010, w: 120, h: 180 },
      { x: 6, y: 2870, w: 140, h: 180 },

      // Chapter 4 - tight/alternating-width shaft (Level 4's trick), 4 pillars.
      { x: 0, y: 2730, w: 130, h: 150 },
      { x: 370, y: 2590, w: 110, h: 150 },
      { x: 0, y: 2450, w: 150, h: 150 },
      { x: 390, y: 2310, w: 90, h: 150 },

      // Chapter 5 - chained shaft with a double-jump rescue, then plain chaining.
      { x: 0, y: 2140, w: 120, h: 180 },
      { x: 360, y: 1990, w: 120, h: 180 },
      { x: 0, y: 1840, w: 120, h: 180 },

      // Chapter 6 - pure double-jump island chain (Level 3's trick), 3 islands.
      { x: 340, y: 1700, w: 140, h: 180 },
      { x: 80, y: 1360, w: 160, h: 180 },
      { x: 330, y: 1020, w: 150, h: 180 },

      // Chapter 7 - endurance marathon shaft, five pillars, tight corridor.
      { x: 370, y: 880, w: 110, h: 150 },
      { x: 0, y: 740, w: 130, h: 150 },
      { x: 350, y: 600, w: 130, h: 150 },
      { x: 0, y: 460, w: 130, h: 150 },
      { x: 350, y: 320, w: 130, h: 150 },

      // Chapter 8 - grand finale combo to the summit.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 6,
    group: 'city',
    groupLevelNumber: 1,
    width: 480,
    height: 3140,
    playerStart: { x: 220, y: 2860 },
    // "Rooftop Primer": the city group's tutorial, reusing the same chamber
    // grammar Level 1 of the forest group taught - a wall jump alone clears
    // ~200px of rise, a chained double jump clears ~370px, and a wall-kick
    // carries ~240px across a standard alley (tighter alleys use 220px).
    // Plain wall-jump ledges use the same exploit-resistant 180px step /
    // 140px height ratio as the forest group throughout.
    platforms: [
      { x: 0, y: 3060, w: 480, h: 80 }, // ground

      // Chapter 1 - Fire-Escape Primer: alternating ledges, plain wall jumps only.
      { x: 0, y: 2920, w: 120, h: 140 },
      { x: 360, y: 2740, w: 120, h: 140 },
      { x: 0, y: 2560, w: 120, h: 140 },
      { x: 360, y: 2380, w: 120, h: 140 },

      // Chapter 2 - Rooftop Gap: no walls, a wall jump alone falls short of
      // this ledge - only a double jump chained onto it gets you there.
      { x: 6, y: 2200, w: 140, h: 180 },

      // Chapter 3 - Billboard + Double-Jump Combo: a single lone wall, then
      // a double jump off it to reach a ledge no plain wall jump can touch.
      { x: 0, y: 2020, w: 120, h: 180 },
      { x: 140, y: 1880, w: 140, h: 180 },

      // Chapter 4 - Chained shaft with a double-jump rescue, then plain
      // chaining for the rest of the climb.
      { x: 0, y: 1730, w: 120, h: 180 },
      { x: 340, y: 1590, w: 120, h: 180 },
      { x: 0, y: 1410, w: 120, h: 180 },
      { x: 340, y: 1230, w: 120, h: 180 },

      // Chapter 5 - Open-air breather between water towers, no forced tech.
      { x: 150, y: 1220, w: 180, h: 30 },
      { x: 280, y: 1050, w: 150, h: 30 },

      // Chapter 6 - Tall chained shaft between two towers: four ledges,
      // tighter 220px alley, purely to reward fast, confident chaining.
      { x: 340, y: 870, w: 120, h: 140 },
      { x: 0, y: 690, w: 120, h: 140 },
      { x: 340, y: 510, w: 120, h: 140 },
      { x: 0, y: 330, w: 120, h: 140 },

      // Chapter 7 - Grand finale combo: wall jump + double jump onto the shrine roof.
      { x: 170, y: 150, w: 140, h: 180 },
    ],
    goal: { x: 240, y: 80, r: 24 },
  },
  {
    id: 7,
    group: 'city',
    groupLevelNumber: 2,
    width: 480,
    height: 2950,
    playerStart: { x: 220, y: 2670 },
    // "Fire Escape Marathon": a longer wall-jump alley than Level 1, then
    // alternating billboard/rooftop combo jumps chained back-to-back, so the
    // double jump gets refreshed and used every single hop instead of once
    // per chapter.
    platforms: [
      { x: 0, y: 2870, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (3 ledges).
      { x: 0, y: 2730, w: 120, h: 140 },
      { x: 360, y: 2550, w: 120, h: 140 },
      { x: 0, y: 2370, w: 120, h: 140 },

      // Chapter 2 - endurance marathon up the alley: six more ledges in a
      // row (nine total from the start), purely testing sustained,
      // confident chaining.
      { x: 360, y: 2190, w: 120, h: 140 },
      { x: 0, y: 2010, w: 120, h: 140 },
      { x: 360, y: 1830, w: 120, h: 140 },
      { x: 0, y: 1650, w: 120, h: 140 },
      { x: 360, y: 1470, w: 120, h: 140 },
      { x: 0, y: 1290, w: 120, h: 140 },

      // Chapter 3 - billboard/rooftop combo chain: wall -> double-jump to a
      // ledge -> short hop to the next wall -> double-jump again, three
      // times over. Every hop refreshes and spends the double jump.
      { x: 340, y: 1110, w: 140, h: 180 },
      { x: 360, y: 930, w: 120, h: 180 },
      { x: 6, y: 790, w: 140, h: 180 },
      { x: 0, y: 610, w: 120, h: 180 },
      { x: 340, y: 470, w: 140, h: 180 },

      // Chapter 4 - finale combo onto the shrine roof.
      { x: 360, y: 290, w: 120, h: 180 },
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 8,
    group: 'city',
    groupLevelNumber: 3,
    width: 480,
    height: 3150,
    playerStart: { x: 220, y: 2870 },
    // "Rooftop Hopscotch": the centerpiece is a pure double-jump ledge
    // chain - water tower to water tower, no walls at all, zig-zagging
    // across the block - since landing on a ledge's top refreshes the
    // double jump exactly like landing on a rooftop does. Ends with a
    // signature maximum-distance leap across the widest billboard gap in
    // the city group.
    platforms: [
      { x: 0, y: 3070, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (2 ledges).
      { x: 0, y: 2930, w: 120, h: 140 },
      { x: 360, y: 2750, w: 120, h: 140 },

      // Chapter 2 - pure double-jump ledge chain: a short wall-jump hop off
      // the primer, then floor-launched combo jumps zig-zagging left/right
      // across open air with no walls.
      { x: 0, y: 2530, w: 120, h: 180 },
      { x: 340, y: 2190, w: 140, h: 180 },
      { x: 80, y: 1850, w: 160, h: 180 },
      { x: 330, y: 1510, w: 150, h: 180 },
      { x: 60, y: 1170, w: 160, h: 180 },

      // Chapter 3 - short wall-jump interlude (breather between aerial sections).
      { x: 360, y: 990, w: 120, h: 140 },
      { x: 0, y: 810, w: 120, h: 140 },

      // Chapter 4 - the signature billboard leap: a wall-jump + double-jump
      // combo across the widest gap in the city group.
      { x: 280, y: 630, w: 200, h: 180 },

      // Chapter 5 - finale combo onto the shrine roof.
      { x: 0, y: 490, w: 120, h: 180 },
      { x: 180, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 270, y: 80, r: 24 },
  },
  {
    id: 9,
    group: 'city',
    groupLevelNumber: 4,
    width: 480,
    height: 3070,
    playerStart: { x: 220, y: 2790 },
    // "Neon Alley Zigzag": alley width changes shaft to shaft - 220px and
    // 240px both appear, so the player has to read each gap rather than
    // settling into one fixed rhythm. All plain wall-jump chapters share the
    // same exploit-resistant 180px step / 140px ledge-height ratio; only the
    // alley width and ledge width vary between them. Chapter 5 narrows the
    // ledges themselves for a precision finish.
    platforms: [
      { x: 0, y: 2990, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (240px alley, 2 ledges).
      { x: 0, y: 2850, w: 120, h: 140 },
      { x: 360, y: 2670, w: 120, h: 140 },

      // Chapter 2 - tight 220px alley, six ledges in a row.
      { x: 0, y: 2490, w: 120, h: 140 },
      { x: 340, y: 2310, w: 120, h: 140 },
      { x: 0, y: 2130, w: 120, h: 140 },
      { x: 340, y: 1950, w: 120, h: 140 },
      { x: 0, y: 1770, w: 120, h: 140 },
      { x: 340, y: 1590, w: 120, h: 140 },

      // Chapter 3 - alternating width: 240, 220, 240. Same vertical step
      // throughout, so only the horizontal commitment changes.
      { x: 0, y: 1410, w: 130, h: 140 },
      { x: 370, y: 1230, w: 110, h: 140 },
      { x: 0, y: 1050, w: 150, h: 140 },
      { x: 390, y: 870, w: 90, h: 140 },

      // Chapter 4 - double-jump combo interlude for pacing.
      { x: 80, y: 690, w: 170, h: 180 },

      // Chapter 5 - narrower precision ledges, still a 220px alley.
      { x: 0, y: 510, w: 110, h: 140 },
      { x: 330, y: 330, w: 110, h: 140 },

      // Chapter 6 - finale combo onto the shrine roof.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 10,
    group: 'city',
    groupLevelNumber: 5,
    width: 480,
    height: 4430,
    playerStart: { x: 220, y: 4150 },
    // "Shibuya Climb": the city group's finale - a tour through every
    // technique introduced across Levels 1-4 (double-jump gap, billboard
    // combo tower, alternating-width shaft, double-jump rescue, pure ledge
    // chain, endurance marathon) back to back, capped with the tallest,
    // most demanding climb in the group. Every plain wall-jump chapter uses
    // the same exploit-resistant 180px step / 140px ledge height as the
    // earlier levels.
    platforms: [
      { x: 0, y: 4350, w: 480, h: 80 }, // ground

      // Chapter 1 - primer (3 ledges).
      { x: 0, y: 4210, w: 120, h: 140 },
      { x: 360, y: 4030, w: 120, h: 140 },
      { x: 0, y: 3850, w: 120, h: 140 },

      // Chapter 2 - rooftop gap (Level 1's opening trick).
      { x: 340, y: 3670, w: 140, h: 180 },

      // Chapter 3 - billboard + double-jump combo tower.
      { x: 360, y: 3490, w: 120, h: 180 },
      { x: 6, y: 3350, w: 140, h: 180 },

      // Chapter 4 - tight/alternating-width shaft (Level 4's trick), 4 ledges.
      { x: 0, y: 3170, w: 130, h: 140 },
      { x: 370, y: 2990, w: 110, h: 140 },
      { x: 0, y: 2810, w: 150, h: 140 },
      { x: 390, y: 2630, w: 90, h: 140 },

      // Chapter 5 - chained shaft with a double-jump rescue, then plain chaining.
      { x: 0, y: 2450, w: 120, h: 180 },
      { x: 360, y: 2270, w: 120, h: 140 },
      { x: 0, y: 2090, w: 120, h: 140 },

      // Chapter 6 - pure double-jump ledge chain (Level 3's trick), 3 ledges.
      { x: 340, y: 1910, w: 140, h: 180 },
      { x: 80, y: 1570, w: 160, h: 180 },
      { x: 330, y: 1230, w: 150, h: 180 },

      // Chapter 7 - endurance marathon shaft, five ledges, tight corridor.
      { x: 340, y: 1050, w: 120, h: 140 },
      { x: 0, y: 870, w: 120, h: 140 },
      { x: 340, y: 690, w: 120, h: 140 },
      { x: 0, y: 510, w: 120, h: 140 },
      { x: 340, y: 330, w: 120, h: 140 },

      // Chapter 8 - grand finale combo onto the shrine roof.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 11,
    group: 'mountain',
    groupLevelNumber: 1,
    width: 480,
    height: 3140,
    playerStart: { x: 220, y: 2860 },
    // "Foothills Ascent": the mountain group's tutorial, reusing the same
    // chamber grammar taught by Level 1 of the earlier groups - a wall jump
    // alone clears ~200px of rise, a chained double jump clears ~370px, and
    // a wall-kick carries ~240px across a standard gap (tighter gaps use
    // 220px). Plain wall-jump ledges use the same exploit-resistant 180px
    // step / 140px height ratio throughout. Storm clouds are gathering, and
    // something is glowing at the summit.
    platforms: [
      { x: 0, y: 3060, w: 480, h: 80 }, // ground

      // Chapter 1 - Windbreak Primer: alternating rock ledges, plain wall jumps only.
      { x: 0, y: 2920, w: 120, h: 140 },
      { x: 360, y: 2740, w: 120, h: 140 },
      { x: 0, y: 2560, w: 120, h: 140 },
      { x: 360, y: 2380, w: 120, h: 140 },

      // Chapter 2 - Crevasse: no walls, a wall jump alone falls short of
      // this ledge - only a double jump chained onto it gets you there.
      { x: 6, y: 2200, w: 140, h: 180 },

      // Chapter 3 - Outcrop + Double-Jump Combo: a single lone rock face,
      // then a double jump off it to reach a ledge no plain wall jump can touch.
      { x: 0, y: 2020, w: 120, h: 180 },
      { x: 140, y: 1880, w: 140, h: 180 },

      // Chapter 4 - Chained shaft with a double-jump rescue, then plain
      // chaining for the rest of the climb.
      { x: 0, y: 1730, w: 120, h: 180 },
      { x: 340, y: 1590, w: 120, h: 180 },
      { x: 0, y: 1410, w: 120, h: 180 },
      { x: 340, y: 1230, w: 120, h: 180 },

      // Chapter 5 - Open-air breather on a snowfield ridge, no forced tech.
      { x: 150, y: 1220, w: 180, h: 30 },
      { x: 280, y: 1050, w: 150, h: 30 },

      // Chapter 6 - Tall chained shaft between two cliff faces: four
      // ledges, tighter 220px gap, purely to reward fast, confident chaining.
      { x: 340, y: 870, w: 120, h: 140 },
      { x: 0, y: 690, w: 120, h: 140 },
      { x: 340, y: 510, w: 120, h: 140 },
      { x: 0, y: 330, w: 120, h: 140 },

      // Chapter 7 - Grand finale combo: wall jump + double jump onto the storm gate's ledge.
      { x: 170, y: 150, w: 140, h: 180 },
    ],
    goal: { x: 240, y: 80, r: 24 },
  },
  {
    id: 12,
    group: 'mountain',
    groupLevelNumber: 2,
    width: 480,
    height: 2950,
    playerStart: { x: 220, y: 2670 },
    // "Windswept Ridge": a longer wall-jump gauntlet than Level 1, then
    // alternating outcrop/ledge combo jumps chained back-to-back, so the
    // double jump gets refreshed and used every single hop instead of once
    // per chapter.
    platforms: [
      { x: 0, y: 2870, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (3 ledges).
      { x: 0, y: 2730, w: 120, h: 140 },
      { x: 360, y: 2550, w: 120, h: 140 },
      { x: 0, y: 2370, w: 120, h: 140 },

      // Chapter 2 - endurance marathon up the ridge: six more ledges in a
      // row (nine total from the start), purely testing sustained,
      // confident chaining into the wind.
      { x: 360, y: 2190, w: 120, h: 140 },
      { x: 0, y: 2010, w: 120, h: 140 },
      { x: 360, y: 1830, w: 120, h: 140 },
      { x: 0, y: 1650, w: 120, h: 140 },
      { x: 360, y: 1470, w: 120, h: 140 },
      { x: 0, y: 1290, w: 120, h: 140 },

      // Chapter 3 - outcrop/ledge combo chain: rock face -> double-jump to
      // a ledge -> short hop to the next rock face -> double-jump again,
      // three times over. Every hop refreshes and spends the double jump.
      { x: 340, y: 1110, w: 140, h: 180 },
      { x: 360, y: 930, w: 120, h: 180 },
      { x: 6, y: 790, w: 140, h: 180 },
      { x: 0, y: 610, w: 120, h: 180 },
      { x: 340, y: 470, w: 140, h: 180 },

      // Chapter 4 - finale combo onto the storm gate's ledge.
      { x: 360, y: 290, w: 120, h: 180 },
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 13,
    group: 'mountain',
    groupLevelNumber: 3,
    width: 480,
    height: 3150,
    playerStart: { x: 220, y: 2870 },
    // "Crevasse Crossing": the centerpiece is a pure double-jump ledge
    // chain - outcrop to outcrop, no walls at all, zig-zagging across open
    // air above a crevasse - since landing on a ledge's top refreshes the
    // double jump exactly like landing on solid rock does. Ends with a
    // signature maximum-distance leap across the widest crevasse in the
    // mountain group.
    platforms: [
      { x: 0, y: 3070, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (2 ledges).
      { x: 0, y: 2930, w: 120, h: 140 },
      { x: 360, y: 2750, w: 120, h: 140 },

      // Chapter 2 - pure double-jump ledge chain: a short wall-jump hop off
      // the primer, then floor-launched combo jumps zig-zagging left/right
      // across the crevasse with no walls.
      { x: 0, y: 2530, w: 120, h: 180 },
      { x: 340, y: 2190, w: 140, h: 180 },
      { x: 80, y: 1850, w: 160, h: 180 },
      { x: 330, y: 1510, w: 150, h: 180 },
      { x: 60, y: 1170, w: 160, h: 180 },

      // Chapter 3 - short wall-jump interlude (breather between aerial sections).
      { x: 360, y: 990, w: 120, h: 140 },
      { x: 0, y: 810, w: 120, h: 140 },

      // Chapter 4 - the signature crevasse leap: a wall-jump + double-jump
      // combo across the widest gap in the mountain group.
      { x: 280, y: 630, w: 200, h: 180 },

      // Chapter 5 - finale combo onto the storm gate's ledge.
      { x: 0, y: 490, w: 120, h: 180 },
      { x: 180, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 270, y: 80, r: 24 },
  },
  {
    id: 14,
    group: 'mountain',
    groupLevelNumber: 4,
    width: 480,
    height: 3070,
    playerStart: { x: 220, y: 2790 },
    // "Switchback Trail": the gap width changes shaft to shaft - 220px and
    // 240px both appear, so the player has to read each gap rather than
    // settling into one fixed rhythm, just like a switchback trail narrows
    // and widens as it climbs. All plain wall-jump chapters share the same
    // exploit-resistant 180px step / 140px ledge-height ratio; only the gap
    // width and ledge width vary between them. Chapter 5 narrows the
    // ledges themselves for a precision finish near the top.
    platforms: [
      { x: 0, y: 2990, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (240px gap, 2 ledges).
      { x: 0, y: 2850, w: 120, h: 140 },
      { x: 360, y: 2670, w: 120, h: 140 },

      // Chapter 2 - tight 220px gap, six ledges in a row.
      { x: 0, y: 2490, w: 120, h: 140 },
      { x: 340, y: 2310, w: 120, h: 140 },
      { x: 0, y: 2130, w: 120, h: 140 },
      { x: 340, y: 1950, w: 120, h: 140 },
      { x: 0, y: 1770, w: 120, h: 140 },
      { x: 340, y: 1590, w: 120, h: 140 },

      // Chapter 3 - alternating width: 240, 220, 240. Same vertical step
      // throughout, so only the horizontal commitment changes.
      { x: 0, y: 1410, w: 130, h: 140 },
      { x: 370, y: 1230, w: 110, h: 140 },
      { x: 0, y: 1050, w: 150, h: 140 },
      { x: 390, y: 870, w: 90, h: 140 },

      // Chapter 4 - double-jump combo interlude for pacing.
      { x: 80, y: 690, w: 170, h: 180 },

      // Chapter 5 - narrower precision ledges, still a 220px gap.
      { x: 0, y: 510, w: 110, h: 140 },
      { x: 330, y: 330, w: 110, h: 140 },

      // Chapter 6 - finale combo onto the storm gate's ledge.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 15,
    group: 'mountain',
    groupLevelNumber: 5,
    width: 480,
    height: 4430,
    playerStart: { x: 220, y: 4150 },
    // "Storm Peak": the mountain group's finale - a tour through every
    // technique introduced across Levels 1-4 (double-jump crevasse,
    // outcrop combo tower, switchback shaft, double-jump rescue, pure
    // ledge chain, endurance marathon) back to back, capped with the
    // tallest, most demanding climb in the group. The summit glow is
    // brightest here, and the storm gate at the top crackles more
    // violently than any gate before it - whatever's waiting at the temple
    // is close now. Every plain wall-jump chapter uses the same
    // exploit-resistant 180px step / 140px ledge height as the earlier levels.
    platforms: [
      { x: 0, y: 4350, w: 480, h: 80 }, // ground

      // Chapter 1 - primer (3 ledges).
      { x: 0, y: 4210, w: 120, h: 140 },
      { x: 360, y: 4030, w: 120, h: 140 },
      { x: 0, y: 3850, w: 120, h: 140 },

      // Chapter 2 - crevasse gap (Level 1's opening trick).
      { x: 340, y: 3670, w: 140, h: 180 },

      // Chapter 3 - outcrop + double-jump combo tower.
      { x: 360, y: 3490, w: 120, h: 180 },
      { x: 6, y: 3350, w: 140, h: 180 },

      // Chapter 4 - tight/alternating-width shaft (Level 4's trick), 4 ledges.
      { x: 0, y: 3170, w: 130, h: 140 },
      { x: 370, y: 2990, w: 110, h: 140 },
      { x: 0, y: 2810, w: 150, h: 140 },
      { x: 390, y: 2630, w: 90, h: 140 },

      // Chapter 5 - chained shaft with a double-jump rescue, then plain chaining.
      { x: 0, y: 2450, w: 120, h: 180 },
      { x: 360, y: 2270, w: 120, h: 140 },
      { x: 0, y: 2090, w: 120, h: 140 },

      // Chapter 6 - pure double-jump ledge chain (Level 3's trick), 3 ledges.
      { x: 340, y: 1910, w: 140, h: 180 },
      { x: 80, y: 1570, w: 160, h: 180 },
      { x: 330, y: 1230, w: 150, h: 180 },

      // Chapter 7 - endurance marathon shaft, five ledges, tight gap.
      { x: 340, y: 1050, w: 120, h: 140 },
      { x: 0, y: 870, w: 120, h: 140 },
      { x: 340, y: 690, w: 120, h: 140 },
      { x: 0, y: 510, w: 120, h: 140 },
      { x: 340, y: 330, w: 120, h: 140 },

      // Chapter 8 - grand finale combo onto the storm gate's ledge, at the summit.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 16,
    group: 'temple',
    groupLevelNumber: 1,
    width: 480,
    height: 3140,
    playerStart: { x: 220, y: 2860 },
    // "Ember Approach": the final group's opening climb, into a burning
    // temple complex - reusing the same chamber grammar every group's
    // Level 1 has taught, since by now the player already knows it cold. A
    // massive shadowed shape watches faintly from the far skyline; it will
    // get closer, and less faint, with every level from here to the end of
    // the game. Plain wall-jump ledges use the same exploit-resistant
    // 180px step / 140px height ratio as every group before this one.
    platforms: [
      { x: 0, y: 3060, w: 480, h: 80 }, // ground

      // Chapter 1 - Charred Approach: alternating temple ledges, plain wall jumps only.
      { x: 0, y: 2920, w: 120, h: 140 },
      { x: 360, y: 2740, w: 120, h: 140 },
      { x: 0, y: 2560, w: 120, h: 140 },
      { x: 360, y: 2380, w: 120, h: 140 },

      // Chapter 2 - Collapsed Span: no walls, a wall jump alone falls
      // short of this ledge - only a double jump chained onto it gets you there.
      { x: 6, y: 2200, w: 140, h: 180 },

      // Chapter 3 - Pillar + Double-Jump Combo: a single scorched pillar,
      // then a double jump off it to reach a ledge no plain wall jump can touch.
      { x: 0, y: 2020, w: 120, h: 180 },
      { x: 140, y: 1880, w: 140, h: 180 },

      // Chapter 4 - Chained shaft with a double-jump rescue, then plain
      // chaining for the rest of the climb.
      { x: 0, y: 1730, w: 120, h: 180 },
      { x: 340, y: 1590, w: 120, h: 180 },
      { x: 0, y: 1410, w: 120, h: 180 },
      { x: 340, y: 1230, w: 120, h: 180 },

      // Chapter 5 - Open-air breather on a collapsed veranda, no forced tech.
      { x: 150, y: 1220, w: 180, h: 30 },
      { x: 280, y: 1050, w: 150, h: 30 },

      // Chapter 6 - Tall chained shaft between two scorched towers: four
      // ledges, tighter 220px gap, purely to reward fast, confident chaining.
      { x: 340, y: 870, w: 120, h: 140 },
      { x: 0, y: 690, w: 120, h: 140 },
      { x: 340, y: 510, w: 120, h: 140 },
      { x: 0, y: 330, w: 120, h: 140 },

      // Chapter 7 - Grand finale combo: wall jump + double jump onto the final gate's ledge.
      { x: 170, y: 150, w: 140, h: 180 },
    ],
    goal: { x: 240, y: 80, r: 24 },
  },
  {
    id: 17,
    group: 'temple',
    groupLevelNumber: 2,
    width: 480,
    height: 2950,
    playerStart: { x: 220, y: 2670 },
    // "Burning Colonnade": a longer wall-jump gauntlet than Level 1, then
    // alternating pillar/ledge combo jumps chained back-to-back through a
    // row of collapsing temple pillars, so the double jump gets refreshed
    // and used every single hop instead of once per chapter. The watching
    // shape is a little larger now, a little less patient.
    platforms: [
      { x: 0, y: 2870, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (3 ledges).
      { x: 0, y: 2730, w: 120, h: 140 },
      { x: 360, y: 2550, w: 120, h: 140 },
      { x: 0, y: 2370, w: 120, h: 140 },

      // Chapter 2 - endurance marathon through the colonnade: six more
      // ledges in a row (nine total from the start), purely testing
      // sustained, confident chaining.
      { x: 360, y: 2190, w: 120, h: 140 },
      { x: 0, y: 2010, w: 120, h: 140 },
      { x: 360, y: 1830, w: 120, h: 140 },
      { x: 0, y: 1650, w: 120, h: 140 },
      { x: 360, y: 1470, w: 120, h: 140 },
      { x: 0, y: 1290, w: 120, h: 140 },

      // Chapter 3 - pillar/ledge combo chain: scorched pillar -> double-jump
      // to a ledge -> short hop to the next pillar -> double-jump again,
      // three times over. Every hop refreshes and spends the double jump.
      { x: 340, y: 1110, w: 140, h: 180 },
      { x: 360, y: 930, w: 120, h: 180 },
      { x: 6, y: 790, w: 140, h: 180 },
      { x: 0, y: 610, w: 120, h: 180 },
      { x: 340, y: 470, w: 140, h: 180 },

      // Chapter 4 - finale combo onto the final gate's ledge.
      { x: 360, y: 290, w: 120, h: 180 },
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 18,
    group: 'temple',
    groupLevelNumber: 3,
    width: 480,
    height: 3150,
    playerStart: { x: 220, y: 2870 },
    // "Ashen Courtyard": the centerpiece is a pure double-jump ledge chain
    // - rooftop to rooftop across a collapsed courtyard, no walls at all,
    // zig-zagging through drifting embers - since landing on a ledge's top
    // refreshes the double jump exactly like landing on solid ground does.
    // Ends with a signature maximum-distance leap across the widest gap in
    // the temple group.
    platforms: [
      { x: 0, y: 3070, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (2 ledges).
      { x: 0, y: 2930, w: 120, h: 140 },
      { x: 360, y: 2750, w: 120, h: 140 },

      // Chapter 2 - pure double-jump ledge chain: a short wall-jump hop off
      // the primer, then floor-launched combo jumps zig-zagging left/right
      // across the courtyard with no walls.
      { x: 0, y: 2530, w: 120, h: 180 },
      { x: 340, y: 2190, w: 140, h: 180 },
      { x: 80, y: 1850, w: 160, h: 180 },
      { x: 330, y: 1510, w: 150, h: 180 },
      { x: 60, y: 1170, w: 160, h: 180 },

      // Chapter 3 - short wall-jump interlude (breather between aerial sections).
      { x: 360, y: 990, w: 120, h: 140 },
      { x: 0, y: 810, w: 120, h: 140 },

      // Chapter 4 - the signature courtyard leap: a wall-jump + double-jump
      // combo across the widest gap in the temple group.
      { x: 280, y: 630, w: 200, h: 180 },

      // Chapter 5 - finale combo onto the final gate's ledge.
      { x: 0, y: 490, w: 120, h: 180 },
      { x: 180, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 270, y: 80, r: 24 },
  },
  {
    id: 19,
    group: 'temple',
    groupLevelNumber: 4,
    width: 480,
    height: 3070,
    playerStart: { x: 220, y: 2790 },
    // "Trial of Ash": the gap width changes shaft to shaft - 220px and
    // 240px both appear, so the player has to read each gap rather than
    // settling into one fixed rhythm. All plain wall-jump chapters share
    // the same exploit-resistant 180px step / 140px ledge-height ratio;
    // only the gap width and ledge width vary between them. Chapter 5
    // narrows the ledges themselves for a precision finish - one misstep
    // from the top now, with the gate's heat already visible.
    platforms: [
      { x: 0, y: 2990, w: 480, h: 80 }, // ground

      // Chapter 1 - quick primer (240px gap, 2 ledges).
      { x: 0, y: 2850, w: 120, h: 140 },
      { x: 360, y: 2670, w: 120, h: 140 },

      // Chapter 2 - tight 220px gap, six ledges in a row.
      { x: 0, y: 2490, w: 120, h: 140 },
      { x: 340, y: 2310, w: 120, h: 140 },
      { x: 0, y: 2130, w: 120, h: 140 },
      { x: 340, y: 1950, w: 120, h: 140 },
      { x: 0, y: 1770, w: 120, h: 140 },
      { x: 340, y: 1590, w: 120, h: 140 },

      // Chapter 3 - alternating width: 240, 220, 240. Same vertical step
      // throughout, so only the horizontal commitment changes.
      { x: 0, y: 1410, w: 130, h: 140 },
      { x: 370, y: 1230, w: 110, h: 140 },
      { x: 0, y: 1050, w: 150, h: 140 },
      { x: 390, y: 870, w: 90, h: 140 },

      // Chapter 4 - double-jump combo interlude for pacing.
      { x: 80, y: 690, w: 170, h: 180 },

      // Chapter 5 - narrower precision ledges, still a 220px gap.
      { x: 0, y: 510, w: 110, h: 140 },
      { x: 330, y: 330, w: 110, h: 140 },

      // Chapter 6 - finale combo onto the final gate's ledge.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
  {
    id: 20,
    group: 'temple',
    groupLevelNumber: 5,
    width: 480,
    height: 4430,
    playerStart: { x: 220, y: 4150 },
    // "The Final Gate": the climax of the entire game - a tour through
    // every technique introduced across the whole journey (double-jump
    // gap, pillar combo tower, alternating-width shaft, double-jump
    // rescue, pure ledge chain, endurance marathon) back to back, capped
    // with the tallest, most demanding climb in the game. The watching
    // shape is no longer faint - it fills the skyline now, eyes lit, right
    // behind the gate at the top. Every plain wall-jump chapter still uses
    // the same exploit-resistant 180px step / 140px ledge height that's
    // carried every level since the very first one.
    platforms: [
      { x: 0, y: 4350, w: 480, h: 80 }, // ground

      // Chapter 1 - primer (3 ledges).
      { x: 0, y: 4210, w: 120, h: 140 },
      { x: 360, y: 4030, w: 120, h: 140 },
      { x: 0, y: 3850, w: 120, h: 140 },

      // Chapter 2 - collapsed span (Level 1's opening trick).
      { x: 340, y: 3670, w: 140, h: 180 },

      // Chapter 3 - pillar + double-jump combo tower.
      { x: 360, y: 3490, w: 120, h: 180 },
      { x: 6, y: 3350, w: 140, h: 180 },

      // Chapter 4 - tight/alternating-width shaft (Level 4's trick), 4 ledges.
      { x: 0, y: 3170, w: 130, h: 140 },
      { x: 370, y: 2990, w: 110, h: 140 },
      { x: 0, y: 2810, w: 150, h: 140 },
      { x: 390, y: 2630, w: 90, h: 140 },

      // Chapter 5 - chained shaft with a double-jump rescue, then plain chaining.
      { x: 0, y: 2450, w: 120, h: 180 },
      { x: 360, y: 2270, w: 120, h: 140 },
      { x: 0, y: 2090, w: 120, h: 140 },

      // Chapter 6 - pure double-jump ledge chain (Level 3's trick), 3 ledges.
      { x: 340, y: 1910, w: 140, h: 180 },
      { x: 80, y: 1570, w: 160, h: 180 },
      { x: 330, y: 1230, w: 150, h: 180 },

      // Chapter 7 - endurance marathon shaft, five ledges, tight gap.
      { x: 340, y: 1050, w: 120, h: 140 },
      { x: 0, y: 870, w: 120, h: 140 },
      { x: 340, y: 690, w: 120, h: 140 },
      { x: 0, y: 510, w: 120, h: 140 },
      { x: 340, y: 330, w: 120, h: 140 },

      // Chapter 8 - grand finale combo onto the final gate, at the very end of the game.
      { x: 0, y: 150, w: 180, h: 180 },
    ],
    goal: { x: 90, y: 80, r: 24 },
  },
];

export function themeLabel(group: ThemeGroup): string {
  switch (group) {
    case 'forest': return 'Forest';
    case 'city': return 'City';
    case 'mountain': return 'Mountain';
    case 'temple': return 'Temple';
  }
}
