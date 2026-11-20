// Material math for the DIY calculators, shared by the pages and the node tests (scripts/test-diy.js).
// Units: feet for lengths, inches for thickness/depth, cubic feet for volume unless a name says otherwise.
(function (root) {
  const FT3_PER_YD3 = 27;

  // QUIKRETE Concrete Mix (No. 1101) data sheet: approximate yield per bag, cubic feet.
  const CONCRETE_BAGS = [
    { lb: 40, yield: 0.30 },
    { lb: 50, yield: 0.375 },
    { lb: 60, yield: 0.45 },
    { lb: 80, yield: 0.60 },
    { lb: 90, yield: 0.675 },
  ];
  const CONCRETE_LB_PER_FT3 = 140; // same data sheet: density approximately 140 lb/ft3

  const pos = x => (isFinite(x) && x > 0 ? x : 0);

  // Volumes (cubic feet)
  const slab = (lengthFt, widthFt, thickIn) => pos(lengthFt) * pos(widthFt) * pos(thickIn) / 12;
  const circleSlab = (diamFt, thickIn) => Math.PI * Math.pow(pos(diamFt) / 2, 2) * pos(thickIn) / 12;
  // Round hole or tube form: diameter in inches, depth in feet (post holes, Sonotube columns).
  const cylinder = (diamIn, depthFt) => Math.PI * Math.pow(pos(diamIn) / 24, 2) * pos(depthFt);

  // Bags of a given yield to cover a volume, after adding a waste allowance (percent).
  // A tiny tolerance keeps exact multiples from rounding up because of float error.
  const bagsFor = (ft3, bagFt3, wastePct = 0) => {
    const need = pos(ft3) * (1 + pos(wastePct) / 100);
    return need === 0 || !(bagFt3 > 0) ? 0 : Math.ceil(need / bagFt3 - 1e-9);
  };

  function concrete(ft3, wastePct = 0) {
    const total = pos(ft3) * (1 + pos(wastePct) / 100);
    return {
      ft3: total,
      yd3: total / FT3_PER_YD3,
      lb: total * CONCRETE_LB_PER_FT3,
      bags: CONCRETE_BAGS.map(b => ({ lb: b.lb, yield: b.yield, count: bagsFor(ft3, b.yield, wastePct) })),
    };
  }

  // Mulch, soil, compost, gravel by volume: area in square feet, depth in inches.
  const BULK_BAGS = [1.5, 2, 3]; // common bag sizes, cubic feet (printed on the bag)
  function bulk(areaFt2, depthIn, bagSizes = BULK_BAGS) {
    const ft3 = pos(areaFt2) * pos(depthIn) / 12;
    return {
      ft3,
      yd3: ft3 / FT3_PER_YD3,
      bags: bagSizes.map(s => ({ size: s, count: bagsFor(ft3, s) })),
    };
  }
  // Area one cubic yard covers at a depth (square feet).
  const yardCovers = depthIn => (pos(depthIn) ? FT3_PER_YD3 * 12 / depthIn : 0);

  // Topsoil, garden soil, raised-bed mix: same volume math plus an allowance for settling (percent), since
  // recommended depths (e.g. Penn State's 4-6 in for lawns) are settled depths. Common bag sizes, cubic feet.
  const SOIL_BAGS = [0.75, 1, 1.5, 2];
  function soil(areaFt2, depthIn, extraPct = 0, bagSizes = SOIL_BAGS) {
    const baseFt3 = pos(areaFt2) * pos(depthIn) / 12;
    const ft3 = baseFt3 * (1 + pos(extraPct) / 100);
    return { baseFt3, ft3, yd3: ft3 / FT3_PER_YD3, bags: bagSizes.map(s => ({ size: s, count: bagsFor(ft3, s) })) };
  }

  // Gravel and crushed stone: sold by the ton in bulk, by the 50 lb bag in stores.
  // Default weight: a 50 lb bag of all-purpose gravel fills 0.5 cu ft (as retailers list QUIKRETE No. 1151),
  // i.e. 100 lb/ft3 = 2,700 lb = 1.35 short tons per cubic yard. Suppliers' figures vary; the user can override it.
  const GRAVEL_BAG = { lb: 50, ft3: 0.5 };
  const GRAVEL_TONS_PER_YD3 = GRAVEL_BAG.lb / GRAVEL_BAG.ft3 * FT3_PER_YD3 / 2000;
  function gravel(areaFt2, depthIn, tonsPerYd3 = GRAVEL_TONS_PER_YD3, extraPct = 0) {
    const base = pos(areaFt2) * pos(depthIn) / 12;
    const ft3 = base * (1 + pos(extraPct) / 100);
    const yd3 = ft3 / FT3_PER_YD3;
    const tons = yd3 * pos(tonsPerYd3);
    return { baseFt3: base, ft3, yd3, tons, lb: tons * 2000, bags: bagsFor(ft3, GRAVEL_BAG.ft3) };
  }
  // Area one short ton covers at a depth (square feet).
  const tonCovers = (depthIn, tonsPerYd3 = GRAVEL_TONS_PER_YD3) =>
    (pos(depthIn) && pos(tonsPerYd3) ? FT3_PER_YD3 / tonsPerYd3 * 12 / depthIn : 0);

  // Paver patio or walkway: pavers to buy, compacted gravel base, and bedding sand.
  // Pavers: area / face area of one paver, plus a cutting allowance (percent), rounded up. Joints (1/16-3/16 in, per
  // CMHA PAV-TEC-009) are ignored, which errs slightly high. The base can be wider than the paved area
  // (baseAreaFt2), so it's priced like gravel(); bedding sand is spread over the paved area only.
  const SAND_BAG_FT3 = 0.5; // assumed volume of a 50 lb bag of sand; the page tells users to check the label
  function pavers({ areaFt2, paverLenIn, paverWidIn, wastePct = 10, baseAreaFt2 = areaFt2, baseIn = 4, sandIn = 1,
    tonsPerYd3 = GRAVEL_TONS_PER_YD3, baseExtraPct = 0 }) {
    const area = pos(areaFt2), face = pos(paverLenIn) * pos(paverWidIn) / 144;
    const exact = face ? area / face : 0;
    const count = exact ? Math.ceil(exact * (1 + pos(wastePct) / 100) - 1e-9) : 0;
    const sandFt3 = area * pos(sandIn) / 12;
    return {
      perFt2: face ? 1 / face : 0, exact, count,
      base: gravel(baseAreaFt2, baseIn, tonsPerYd3, baseExtraPct),
      sand: { ft3: sandFt3, yd3: sandFt3 / FT3_PER_YD3, bags: bagsFor(sandFt3, SAND_BAG_FT3) },
    };
  }
  // Base area for a rectangle when the base extends `extendIn` inches past every edge.
  const baseArea = (lengthFt, widthFt, extendIn) => (pos(lengthFt) + pos(extendIn) / 6) * (pos(widthFt) + pos(extendIn) / 6);

  // Wood picket fence: posts, backer rails, pickets, and concrete + gravel for the post holes.
  // Counting follows the Outdoor Essentials (UFP) "Fence calculator: building with pickets" worksheet: 1 post per section,
  // +1 to end the run, +1 per gate; 2 rails per section for a 4 ft fence, 3 for 6 ft; pickets = length in inches /
  // (picket width + gap), +10% recommended. Sections are counted per side (rounded up), so a short side still gets a full
  // section; corner posts are shared, and a fence that closes on itself needs no end post.
  // Post holes follow QUIKRETE's "Setting Posts" guide: hole diameter 3x the post width, depth = 1/3 of the post's overall
  // length (which is half its height above ground) plus 6 in of gravel; concrete stops 3-4 in below grade (we use 3 in,
  // which errs high) and the post's own volume is subtracted. Square posts only (4x4 = 3.5 in, 6x6 = 5.5 in actual).
  const POST_TOP_SOIL_IN = 3, POST_GRAVEL_IN = 6;
  function fence({ sidesFt, spacingFt = 8, gates = 0, closed = false, railsPerSection = 3, picketWidthIn = 5.5, gapIn = 0,
    picketExtraPct = 10, heightFt = 6, postWidthIn = 3.5, buryIn = pos(heightFt) * 6, concreteWastePct = 10 }) {
    const sides = (sidesFt || []).map(pos).filter(x => x > 0);
    const lengthFt = sides.reduce((a, x) => a + x, 0);
    const sections = pos(spacingFt) ? sides.reduce((a, x) => a + Math.ceil(x / spacingFt - 1e-9), 0) : 0;
    const posts = sections ? sections + (closed ? 0 : 1) + Math.floor(pos(gates)) : 0;
    const exactPickets = pos(picketWidthIn) ? lengthFt * 12 / (picketWidthIn + pos(gapIn)) : 0;
    const pickets = exactPickets ? Math.ceil(exactPickets * (1 + pos(picketExtraPct) / 100) - 1e-9) : 0;
    const w = pos(postWidthIn), bury = pos(buryIn);
    const holeDiamIn = 3 * w, holeDepthIn = bury ? bury + POST_GRAVEL_IN : 0;
    const fillFt = Math.max(0, bury - POST_TOP_SOIL_IN) / 12;
    const perPostFt3 = Math.max(0, cylinder(holeDiamIn, fillFt) - (w / 12) ** 2 * fillFt);
    const gravelPerPostFt3 = cylinder(holeDiamIn, POST_GRAVEL_IN / 12);
    const postLengthFt = pos(heightFt) + bury / 12;
    return {
      lengthFt, sections, posts, rails: sections * Math.floor(pos(railsPerSection)), exactPickets, pickets, postCaps: posts,
      postLengthFt, buyPostFt: postLengthFt ? 2 * Math.ceil(postLengthFt / 2 - 1e-9) : 0,
      holeDiamIn, holeDepthIn, perPostFt3,
      concrete: concrete(perPostFt3 * posts, concreteWastePct),
      gravel: { ft3: gravelPerPostFt3 * posts, bags: bagsFor(gravelPerPostFt3 * posts, GRAVEL_BAG.ft3) },
    };
  }
  // Rails per section suggested by the worksheet: 2 up to 4 ft tall, 3 above that.
  const fenceRails = heightFt => (pos(heightFt) <= 4 ? 2 : 3);

  // Wall paint. Openings are subtracted; ceiling optional. Returns gallons needed (not rounded)
  // and a buy suggestion in gallons + quarts.
  function paint({ perimeterFt, heightFt, doors = 0, windows = 0, doorFt2 = 20, windowFt2 = 15,
    coats = 2, coverage = 350, ceilingFt2 = 0 }) {
    const walls = pos(perimeterFt) * pos(heightFt);
    const openings = pos(doors) * pos(doorFt2) + pos(windows) * pos(windowFt2);
    const wallArea = Math.max(0, walls - openings);
    const area = wallArea + pos(ceilingFt2);
    const gallons = pos(coverage) ? area * pos(coats) / coverage : 0;
    return { walls, openings, wallArea, area, gallons, buy: buyPaint(gallons) };
  }

  // Cheapest-sensible container mix: whole gallons, plus quarts for a small remainder
  // (3 or more quarts -> buy another gallon instead).
  function buyPaint(gallons) {
    if (!(gallons > 0)) return { gallons: 0, quarts: 0 };
    let g = Math.floor(gallons + 1e-9);
    let q = Math.ceil((gallons - g) * 4 - 1e-9);
    if (q >= 3) { g += 1; q = 0; }
    return { gallons: g, quarts: q };
  }

  // Room (rectangular): perimeter from length and width.
  const perimeter = (lengthFt, widthFt) => 2 * (pos(lengthFt) + pos(widthFt));

  // Cubic yards for any mix of areas: each part is { shape: 'rect' | 'circle' | 'triangle', a, b, depthIn },
  // with a = length / diameter / base and b = width / (unused) / height, all in feet. Returns per-part and total volume.
  const M3_PER_YD3 = 0.764554857984; // 1 yd = 0.9144 m exactly, so 1 yd3 = 0.9144^3 m3
  function partArea({ shape, a, b }) {
    if (shape === 'circle') return Math.PI * Math.pow(pos(a) / 2, 2);
    if (shape === 'triangle') return pos(a) * pos(b) / 2;
    return pos(a) * pos(b);
  }
  function cubicYards(parts) {
    const rows = (parts || []).map(p => {
      const area = partArea(p), ft3 = area * pos(p.depthIn) / 12;
      return { area, ft3, yd3: ft3 / FT3_PER_YD3 };
    });
    const ft3 = rows.reduce((s, r) => s + r.ft3, 0);
    return { rows, area: rows.reduce((s, r) => s + r.area, 0), ft3, yd3: ft3 / FT3_PER_YD3, m3: ft3 / FT3_PER_YD3 * M3_PER_YD3 };
  }

  // Pickup bed, loaded level with the top of the sides. Inside measurements in inches. The wheel wells are treated as
  // two boxes: together they take (width - width between the wells) x well length x well height (capped at the bed depth).
  function truckBed({ lengthIn, widthIn, depthIn, betweenWellsIn = 0, wellLengthIn = 0, wellHeightIn = 0 }) {
    const L = pos(lengthIn), W = pos(widthIn), D = pos(depthIn);
    const gross = L * W * D;
    const wellW = pos(betweenWellsIn) && pos(betweenWellsIn) < W ? W - betweenWellsIn : 0;
    const wells = wellW * Math.min(pos(wellLengthIn), L) * Math.min(pos(wellHeightIn), D);
    const ft3 = (gross - wells) / 1728;
    return { grossFt3: gross / 1728, wellsFt3: wells / 1728, ft3, yd3: ft3 / FT3_PER_YD3 };
  }
  // What the truck can legally carry: the placard's "combined weight of occupants and cargo" minus the people
  // (49 CFR 575.6 steps 1-4), then the smaller of what fits by weight and what fits by space.
  function truckLoad({ bedYd3, payloadLb, peopleLb = 0, lbPerYd3 }) {
    const cargoLb = Math.max(0, pos(payloadLb) - pos(peopleLb));
    const byWeight = pos(lbPerYd3) ? cargoLb / lbPerYd3 : Infinity;
    const bySpace = pos(bedYd3);
    const yd3 = Math.min(byWeight, bySpace);
    return { cargoLb, byWeight, bySpace, yd3, lb: yd3 * pos(lbPerYd3), limit: byWeight < bySpace ? 'weight' : 'space' };
  }
  // Whole bags of a given weight the cargo capacity allows.
  const bagsByWeight = (cargoLb, bagLb) => (pos(bagLb) ? Math.floor(pos(cargoLb) / bagLb + 1e-9) : 0);

  // Segmental (dry-stacked) retaining wall, built the way Allan Block's residential "Basic installation" guide describes:
  // a base trench 24 in wide, 6 in of compacted wall rock, the first course buried 1 in per foot of wall height, and wall
  // rock 12 in behind the block up to the height of the block. Block sizes are the face length and height (inches).
  // Caps (optional, capLenIn > 0) sit on top and count toward the exposed height. Hollow cores aren't filled in the
  // gravel total (solid garden blocks have none); the waste allowance covers cut blocks at the ends.
  const RW_BURY_IN_PER_FT = 1, RW_BASE_WIDTH_IN = 24, RW_BASE_DEPTH_IN = 6, RW_DRAIN_IN = 12, RW_DRAIN_PIPE_OVER_IN = 48;
  function retainingWall({ lengthFt, heightIn, blockLenIn, blockHtIn, wastePct = 5, capLenIn = 0, capHtIn = 0,
    buryIn = pos(heightIn) / 12 * RW_BURY_IN_PER_FT, baseWidthIn = RW_BASE_WIDTH_IN, baseDepthIn = RW_BASE_DEPTH_IN,
    drainIn = RW_DRAIN_IN, tonsPerYd3 = GRAVEL_TONS_PER_YD3 }) {
    const L = pos(lengthFt), bl = pos(blockLenIn), bh = pos(blockHtIn), capH = pos(capLenIn) ? pos(capHtIn) : 0;
    const stackIn = Math.max(0, pos(heightIn) - capH) + pos(buryIn);
    const courses = bh && L && stackIn ? Math.ceil(stackIn / bh - 1e-9) : 0;
    const perCourse = bl && courses ? Math.ceil(L * 12 / bl - 1e-9) : 0;
    const exactBlocks = courses * perCourse;
    const blocks = Math.ceil(exactBlocks * (1 + pos(wastePct) / 100) - 1e-9);
    const caps = pos(capLenIn) && courses ? Math.ceil(L * 12 / capLenIn * (1 + pos(wastePct) / 100) - 1e-9) : 0;
    const blockHeightIn = courses * bh;
    const baseFt3 = L * pos(baseWidthIn) / 12 * pos(baseDepthIn) / 12;
    const drainFt3 = L * pos(drainIn) / 12 * blockHeightIn / 12;
    const trenchDepthIn = courses ? pos(baseDepthIn) + pos(buryIn) : 0;
    return {
      courses, perCourse, exactBlocks, blocks, caps, blockHeightIn,
      exposedIn: courses ? blockHeightIn - pos(buryIn) + capH : 0,
      faceFt2: L * blockHeightIn / 12,
      trenchDepthIn, digFt3: L * pos(baseWidthIn) / 12 * trenchDepthIn / 12,
      baseFt3, drainFt3, gravel: gravel(courses ? (baseFt3 + drainFt3) * 12 : 0, 1, tonsPerYd3),
      drainPipe: pos(heightIn) > RW_DRAIN_PIPE_OVER_IN,
    };
  }

  // Sod, ordered the way Purdue Extension's "Establishing a Lawn from Sod" (AY-28-W) describes: vendors sell by the square
  // yard (sq ft / 9), add about 10% for cutting and measuring errors, a pallet holds about 50 sq yd (450 sq ft), and sod
  // weighs about 35-40 lb per sq yd. Slabs are typically 18 x 24 in; rolls 18 in x 6 ft or 24 in x 5 ft (piece size, inches).
  const SOD_PALLET_FT2 = 450, SOD_LB_PER_YD2 = [35, 40];
  function sod({ areaFt2, extraPct = 10, pieceWIn = 18, pieceLIn = 24, palletFt2 = SOD_PALLET_FT2 }) {
    const yd2 = Math.ceil(pos(areaFt2) * (1 + pos(extraPct) / 100) / 9 - 1e-9);
    const orderFt2 = yd2 * 9, pieceFt2 = pos(pieceWIn) * pos(pieceLIn) / 144, pallet = pos(palletFt2);
    const pallets = pallet ? orderFt2 / pallet : 0;
    const fullPallets = Math.floor(pallets + 1e-9), leftFt2 = Math.max(0, orderFt2 - fullPallets * pallet);
    const per = n => (pieceFt2 && n ? Math.ceil(n / pieceFt2 - 1e-9) : 0);
    return {
      yd2, orderFt2, pieceFt2, pieces: per(orderFt2), pallets, palletsUp: Math.ceil(pallets - 1e-9),
      fullPallets, leftFt2, leftPieces: per(leftFt2), perPallet: pieceFt2 ? Math.floor(pallet / pieceFt2 + 1e-9) : 0,
      lbLow: yd2 * SOD_LB_PER_YD2[0], lbHigh: yd2 * SOD_LB_PER_YD2[1],
    };
  }

  // Grass seed for a new lawn, in lb of seed per 1,000 sq ft (new seedings, not overseeding):
  // Purdue Extension AY-3-W Table 2 (Indiana/Illinois): Kentucky bluegrass 1.5-2, KBG + 10-15% perennial rye 3-4,
  // KBG + 30-50% fine fescue 4-5, tall fescue 6-9. Penn State Extension "Turfgrass Seed and Seed Mixtures": turf-type
  // perennial ryegrass 4-5, fine fescues 4-5. NC State Extension AG-69 "Carolina Lawns" Table 2b: bermudagrass 1-2,
  // zoysiagrass 1-2 (only a few cultivars come as seed), centipedegrass 0.25-0.5, bahiagrass 5; St. Augustinegrass has no seed.
  // Purdue and NC State both say to sow half the seed in one direction and half at right angles; Purdue AY-3-W: one bale of
  // straw per 1,000 sq ft as a light mulch.
  const GRASS_SEED = {
    'tall-fescue': { name: 'Tall fescue (turf-type)', lb: [6, 9], src: 'purdue' },
    'kbg': { name: 'Kentucky bluegrass', lb: [1.5, 2], src: 'purdue' },
    'kbg-rye': { name: 'Kentucky bluegrass + 10-15% perennial ryegrass', lb: [3, 4], src: 'purdue' },
    'kbg-fine': { name: 'Kentucky bluegrass + 30-50% fine fescue', lb: [4, 5], src: 'purdue' },
    'rye': { name: 'Perennial ryegrass (turf-type)', lb: [4, 5], src: 'psu' },
    'fine-fescue': { name: 'Fine fescues', lb: [4, 5], src: 'psu' },
    'bermuda': { name: 'Bermudagrass', lb: [1, 2], src: 'ncsu' },
    'zoysia': { name: 'Zoysiagrass', lb: [1, 2], src: 'ncsu' },
    'centipede': { name: 'Centipedegrass', lb: [0.25, 0.5], src: 'ncsu' },
    'bahia': { name: 'Bahiagrass', lb: [5, 5], src: 'ncsu' },
  };
  const STRAW_FT2_PER_BALE = 1000;
  function grassSeed({ areaFt2, lbLow, lbHigh = lbLow, bagLb = 0, bagPrice = 0 }) {
    const k = pos(areaFt2) / 1000, bag = pos(bagLb);
    const low = k * pos(lbLow), high = k * Math.max(pos(lbLow), pos(lbHigh));
    const bags = n => (bag && n ? Math.ceil(n / bag - 1e-9) : 0);
    const bagsHigh = bags(high);
    return {
      low, high, perPassHigh: high / 2, bagsLow: bags(low), bagsHigh,
      cost: pos(bagPrice) * bagsHigh, leftoverLb: bagsHigh ? bagsHigh * bag - high : 0,
      strawBales: k ? Math.ceil(pos(areaFt2) / STRAW_FT2_PER_BALE - 1e-9) : 0,
    };
  }

  // Firewood. NIST Handbook 130 (2026), Method of Sale 2.4.1.2: a cord is the wood in 128 ft3 "ranked and well stowed"
  // (pieces in a row, touching, parallel, stacked compactly). A stack's volume is its length x height x piece length.
  const CORD_FT3 = 128;
  function woodStack({ lengthFt, heightFt, pieceIn, rows = 1 }) {
    const n = Math.max(1, Math.floor(pos(rows)));
    const ft3 = pos(lengthFt) * pos(heightFt) * pos(pieceIn) / 12 * n;
    return { ft3, cords: ft3 / CORD_FT3 };
  }
  // What a quoted price works out to per full cord.
  const pricePerCord = (price, cords) => (pos(price) && pos(cords) ? price / cords : 0);
  // Clemson University Forestry Bulletin 30 (Marsinko & Wooten, 1982), Table 1, 18-inch wood: box volume (wheel wells
  // subtracted) and the stacked volume each load measured once restacked on a rack, by loading method (ft3).
  const PICKUP_STUDY = [
    { truck: '1975 Dodge short bed', box: 48.5, randomTop: 29.80, stackedTop: 40.83, randomAbove: 37.89, stackedAbove: 51.52 },
    { truck: '1981 Ford short bed', box: 62.1, randomTop: 38.16, stackedTop: 49.47, randomAbove: 48.00, stackedAbove: 61.23 },
    { truck: '1975-76 Datsun', box: 38.6, randomTop: 23.62, stackedTop: 31.23, randomAbove: 29.64, stackedAbove: 39.57 },
    { truck: '1978 Dodge long bed', box: 72.8, randomTop: 45.23, stackedTop: 60.59, randomAbove: 56.54, stackedAbove: 73.98 },
  ];
  const WELLS_FT3 = 2.8; // the study's wheel-well allowance for the full-size trucks
  // Share of the box volume a loading method actually held: [lowest, highest] across the study's 4 trucks.
  const pickupFill = method => {
    const r = PICKUP_STUDY.map(t => t[method] / t.box);
    return [Math.min(...r), Math.max(...r)];
  };
  function pickupWood({ lengthIn, widthIn, depthIn, wells = false, method }) {
    const gross = pos(lengthIn) * pos(widthIn) * pos(depthIn) / 1728;
    const box = Math.max(0, gross - (wells ? WELLS_FT3 : 0));
    const [lo, hi] = pickupFill(method);
    return { box, lowFt3: box * lo, highFt3: box * hi, lowCords: box * lo / CORD_FT3, highCords: box * hi / CORD_FT3 };
  }

  root.DiyEngine = {
    FT3_PER_YD3, CONCRETE_BAGS, CONCRETE_LB_PER_FT3, BULK_BAGS, SOIL_BAGS, GRAVEL_BAG, GRAVEL_TONS_PER_YD3,
    slab, circleSlab, cylinder, bagsFor, concrete, bulk, yardCovers, soil, gravel, tonCovers, paint, buyPaint, perimeter,
    SAND_BAG_FT3, pavers, baseArea, fence, fenceRails,
    M3_PER_YD3, partArea, cubicYards, truckBed, truckLoad, bagsByWeight,
    RW_BASE_WIDTH_IN, RW_BASE_DEPTH_IN, RW_DRAIN_IN, retainingWall,
    SOD_PALLET_FT2, SOD_LB_PER_YD2, sod,
    GRASS_SEED, STRAW_FT2_PER_BALE, grassSeed,
    CORD_FT3, woodStack, pricePerCord, PICKUP_STUDY, WELLS_FT3, pickupFill, pickupWood,
  };
})(typeof window !== 'undefined' ? window : module.exports);
