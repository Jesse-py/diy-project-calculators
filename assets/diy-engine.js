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

  root.DiyEngine = {
    FT3_PER_YD3, CONCRETE_BAGS, CONCRETE_LB_PER_FT3, BULK_BAGS,
    slab, circleSlab, cylinder, bagsFor, concrete, bulk, yardCovers, paint, buyPaint, perimeter,
  };
})(typeof window !== 'undefined' ? window : module.exports);
