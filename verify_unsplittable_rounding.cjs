"use strict";

const assert = require("node:assert/strict");

// Dmitry Rybin's 2026 counterexample, independently formalized in the AFP.
// https://isa-afp.org/entries/Dinitz_Garg_Goemans_Counterexample.html
const reference = {
  "source": "s",
  "terminals": {
    "t1": 15,
    "t2": 10,
    "t3": 15
  },
  "arcs": [
    {"tail": "s", "head": "t1", "x": 10, "cost": 2},
    {"tail": "s", "head": "t2", "x": 6, "cost": 3},
    {"tail": "s", "head": "u",  "x": 24, "cost": 0},
    {"tail": "u", "head": "t3", "x": 10, "cost": 2},
    {"tail": "u", "head": "v",  "x": 14, "cost": 0},
    {"tail": "v", "head": "t1", "x": 5,  "cost": 0},
    {"tail": "v", "head": "w",  "x": 9,  "cost": 0},
    {"tail": "w", "head": "t2", "x": 4,  "cost": 0},
    {"tail": "w", "head": "t3", "x": 5,  "cost": 0}
  ]
};

function verifyPublishedInstance() {
  const { arcs, source, terminals } = reference;
  function pathsFrom(vertex, terminal) {
    if (vertex === terminal) return [[]];
    return arcs.flatMap((edge, index) => edge.tail === vertex
      ? pathsFrom(edge.head, terminal).map(path => [index, ...path])
      : []);
  }

  const terminalNames = Object.keys(terminals);
  const options = terminalNames.map(terminal => pathsFrom(source, terminal));
  assert.deepEqual(options.map(paths => paths.length), [2, 2, 2]);
  const fractionalCost = arcs.reduce((sum, edge) => sum + edge.x * edge.cost, 0);
  let minCostWithAllowance15 = Infinity;
  let minAllowanceAtFractionalCost = Infinity;
  for (const a of options[0]) {
    for (const b of options[1]) {
      for (const c of options[2]) {
        const choices = [a, b, c];
        const loads = arcs.map((_, index) => choices.reduce((sum, path, terminal) =>
          sum + (path.includes(index) ? terminals[terminalNames[terminal]] : 0), 0));
        const excess = Math.max(...loads.map((load, index) => load - arcs[index].x));
        const cost = loads.reduce((sum, load, index) => sum + load * arcs[index].cost, 0);
        if (excess <= 15) minCostWithAllowance15 = Math.min(minCostWithAllowance15, cost);
        if (cost <= fractionalCost) minAllowanceAtFractionalCost = Math.min(minAllowanceAtFractionalCost, excess);
      }
    }
  }

  const results = { fractionalCost, minCostWithAllowance15, minAllowanceAtFractionalCost };
  assert.deepEqual(results, {
    fractionalCost: 58, minCostWithAllowance15: 60, minAllowanceAtFractionalCost: 16,
  });
  return results;
}

function netDemand(vertexCount, arcs, flow) {
  const demand = Array(vertexCount).fill(0);
  arcs.forEach((arc, index) => {
    demand[arc.u] -= flow[index];
    demand[arc.v] += flow[index];
  });
  return demand;
}

// Demand is net inflow after subtracting the lower bounds on the arcs.
function minCostFlow(vertexCount, arcs, demand) {
  const supplyNode = vertexCount;
  const demandNode = vertexCount + 1;
  const residual = [];
  function addArc(u, v, capacity, cost) {
    residual.push({ u, v, capacity, cost }, { u: v, v: u, capacity: 0, cost: -cost });
  }

  for (const { u, v, upper, lower, cost } of arcs) addArc(u, v, upper - lower, cost);
  let unserved = 0;
  demand.forEach((balance, vertex) => {
    if (balance < 0) addArc(supplyNode, vertex, -balance, 0);
    if (balance > 0) {
      addArc(vertex, demandNode, balance, 0);
      unserved += balance;
    }
  });

  while (unserved > 0) {
    const distance = Array(vertexCount + 2).fill(Infinity);
    const previous = Array(vertexCount + 2).fill(-1);
    distance[supplyNode] = 0;
    for (let pass = 0; pass < vertexCount + 1; pass++) {
      let changed = false;
      for (const [index, arc] of residual.entries()) {
        if (arc.capacity > 0 && distance[arc.u] + arc.cost < distance[arc.v]) {
          distance[arc.v] = distance[arc.u] + arc.cost;
          previous[arc.v] = index;
          changed = true;
        }
      }
      if (!changed) break;
    }
    assert(Number.isFinite(distance[demandNode]), "No feasible flow");

    let amount = unserved;
    const path = [];
    for (let vertex = demandNode; vertex !== supplyNode;) {
      const index = previous[vertex];
      assert(index >= 0 && path.length < vertexCount + 2, "Invalid residual path");
      path.push(index);
      amount = Math.min(amount, residual[index].capacity);
      vertex = residual[index].u;
    }
    for (const index of path) {
      residual[index].capacity -= amount;
      residual[index ^ 1].capacity += amount;
    }
    unserved -= amount;
  }
  return arcs.map((arc, index) => arc.lower + residual[2 * index + 1].capacity);
}

function residualPotentials(vertexCount, arcs, flow, capacity) {
  const potential = Array(vertexCount).fill(0);
  for (let pass = 0; pass < vertexCount; pass++) {
    let changed = false;
    for (const [index, arc] of arcs.entries()) {
      if (flow[index] < capacity[index] && potential[arc.v] > potential[arc.u] + arc.cost) {
        potential[arc.v] = potential[arc.u] + arc.cost;
        changed = true;
      }
      if (flow[index] > 0 && potential[arc.u] > potential[arc.v] - arc.cost) {
        potential[arc.u] = potential[arc.v] - arc.cost;
        changed = true;
      }
    }
    if (!changed) return potential;
  }
  throw new Error("Negative cycle in the optimal flow residual");
}

function findFractionalCycle(vertexCount, arcs, flow, unit) {
  const forest = Array.from({ length: vertexCount }, () => []);
  for (const [index, edge] of arcs.entries()) {
    if (flow[index] % unit === 0) continue;

    const pending = [edge.v];
    const path = new Map([[edge.v, null]]);
    for (const vertex of pending) {
      if (vertex === edge.u) break;
      for (const neighbor of forest[vertex]) {
        if (path.has(neighbor.vertex)) continue;
        path.set(neighbor.vertex, { parent: vertex, index: neighbor.index });
        pending.push(neighbor.vertex);
      }
    }

    if (path.has(edge.u)) {
      const cycle = [{ index, sign: 1 }];
      for (let vertex = edge.u; vertex !== edge.v;) {
        const link = path.get(vertex);
        cycle.push({ index: link.index, sign: arcs[link.index].u === link.parent ? 1 : -1 });
        vertex = link.parent;
      }
      return cycle;
    }
    forest[edge.u].push({ vertex: edge.v, index });
    forest[edge.v].push({ vertex: edge.u, index });
  }
  return null;
}

// Use integer numerators throughout. Only amounts divisible by unit are integral
// in the normalized problem.
function roundCirculation(vertexCount, arcs, original, terminals, unit, large) {
  const sink = vertexCount;
  const augmented = [
    ...arcs,
    ...terminals.map(terminal => ({ u: terminal, v: sink })),
    { u: sink, v: 0 },
  ];
  const flow = [
    ...original, large, ...terminals.slice(1).map(() => unit),
    large + (terminals.length - 1) * unit,
  ];
  const largeExit = arcs.length;

  for (let step = 0; step < augmented.length; step++) {
    const cycle = findFractionalCycle(vertexCount + 1, augmented, flow, unit);
    if (!cycle) break;
    if (cycle.some(edge => edge.index === largeExit && edge.sign > 0)) {
      for (const edge of cycle) edge.sign = -edge.sign;
    }
    let amount = unit;
    for (const { index, sign } of cycle) {
      const remainder = flow[index] % unit;
      const distance = sign > 0 ? unit - remainder : remainder;
      amount = Math.min(amount, distance);
    }
    assert(amount > 0);
    for (const { index, sign } of cycle) flow[index] += sign * amount;
  }

  assert(flow.every(value => value % unit === 0));
  assert(netDemand(vertexCount + 1, augmented, flow).every(value => value === 0));
  assert.equal(flow[largeExit], large - large % unit);
  return flow.slice(0, arcs.length).map(value => value / unit);
}

function findPath(arcs, target, candidates) {
  const visited = new Set([0]);
  const previous = new Map();
  const pending = [0];
  for (const vertex of pending) {
    if (vertex === target) break;
    for (const index of candidates) {
      const arc = arcs[index];
      if (arc.u !== vertex || visited.has(arc.v)) continue;
      previous.set(arc.v, index);
      visited.add(arc.v);
      pending.push(arc.v);
    }
  }
  assert(visited.has(target), "No path to terminal");
  const path = [];
  for (let vertex = target; vertex !== 0;) {
    const index = previous.get(vertex);
    path.push(index);
    vertex = arcs[index].u;
  }
  return path.reverse();
}

function cost(arcs, flow) {
  return arcs.reduce((sum, arc, index) => sum + arc.cost * flow[index], 0);
}

function checkRounding(vertexCount, arcs, terminals, original, unit, large) {
  const originalDemand = netDemand(vertexCount, arcs, original);
  assert.equal(originalDemand[terminals[0]], large);
  assert(terminals.slice(1).every(terminal => originalDemand[terminal] === unit));
  const limit = original.map(flow => Math.ceil(flow / unit));
  const k = Math.floor(large / unit);
  const fractionalLimits = limit.map(capacity => capacity * unit);
  const f = minCostFlow(vertexCount, arcs.map((arc, index) => ({
    ...arc, lower: 0, upper: fractionalLimits[index],
  })), originalDemand);
  assert.deepEqual(netDemand(vertexCount, arcs, f), originalDemand);
  const minimumCost = cost(arcs, f);
  assert(minimumCost <= cost(arcs, original));
  const potential = residualPotentials(vertexCount, arcs, f, fractionalLimits);

  const face = arcs.map((arc, index) => ({
    ...arc, cost: 0,
    lower: f[index] === fractionalLimits[index] ? limit[index] : 0,
    upper: f[index] === 0 ? 0 : limit[index],
  }));
  const demandForZ = Array(vertexCount).fill(0);
  demandForZ[0] = -k - terminals.length + 1;
  demandForZ[terminals[0]] = k;
  for (const terminal of terminals.slice(1)) demandForZ[terminal] = 1;
  const lowerBoundDemand = netDemand(vertexCount, arcs, face.map(arc => arc.lower));
  const feasibleZ = minCostFlow(vertexCount, face, demandForZ.map((demand, vertex) =>
    demand - lowerBoundDemand[vertex]));
  const z = roundCirculation(vertexCount, arcs, f, terminals, unit, large);
  for (const candidate of [feasibleZ, z]) {
    assert.deepEqual(netDemand(vertexCount, arcs, candidate), demandForZ);
    assert(candidate.every((amount, index) => face[index].lower <= amount && amount <= face[index].upper));
  }
  assert(z.every((amount, index) =>
    amount === Math.floor(f[index] / unit) || amount === Math.ceil(f[index] / unit)));

  const costDifference = minimumCost - unit * cost(arcs, z);
  assert.equal(costDifference, (large - k * unit) * (potential[terminals[0]] - potential[0]));
  const remaining = z.slice();
  function extract(terminal) {
    const path = findPath(arcs, terminal, [...arcs.keys()].filter(index => remaining[index] > 0));
    for (const index of path) remaining[index]--;
    return path;
  }
  let bestLargePath;
  let cheapestCost = Infinity;
  for (let count = 0; count < k; count++) {
    const path = extract(terminals[0]);
    const pathCost = path.reduce((sum, index) => sum + arcs[index].cost, 0);
    if (pathCost < cheapestCost) {
      bestLargePath = path;
      cheapestCost = pathCost;
    }
  }
  assert(cheapestCost <= potential[terminals[0]] - potential[0]);

  const fractionalPart = large - k * unit;
  const change = f.map((amount, index) => amount - unit * z[index]
    - (bestLargePath.includes(index) ? fractionalPart : 0));
  const denominator = 1 + Math.max(...change.map(Math.abs));
  const perturbed = f.map((amount, index) => denominator * amount + change[index]);
  assert(perturbed.every((amount, index) =>
    amount >= 0 && amount <= denominator * fractionalLimits[index]));
  assert.deepEqual(netDemand(vertexCount, arcs, perturbed),
    originalDemand.map(demand => denominator * demand));
  assert(cost(arcs, perturbed) >= denominator * minimumCost);

  const rounded = Array(arcs.length).fill(0);
  for (const index of bestLargePath) rounded[index] += large;
  for (const terminal of terminals.slice(1)) {
    for (const index of extract(terminal)) rounded[index] += unit;
  }
  assert(netDemand(vertexCount, arcs, remaining).every(value => value === 0));
  assert.deepEqual(netDemand(vertexCount, arcs, rounded), originalDemand);
  assert(rounded.every((load, index) => load < original[index] + large));
  const roundedCost = cost(arcs, rounded);
  assert(roundedCost <= minimumCost);
  return { optimalFlow: f, minimumCost, roundedCost, costDifference };
}

function verifySeededInstances() {
  let state = 836151;
  function draw() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  }

  const totals = {
    checked: 0,
    dag: 0,
    allowsCycles: 0,
    nonintegerRatios: 0,
    moreThanTwoTerminals: 0,
    nonzeroCostDifference: 0,
    minimumCostInputs: { checked: 0, sameCostAfterRounding: 0 },
  };
  for (let sample = 0; sample < 30000; sample++) {
    const vertexCount = 5 + Math.floor(9 * draw());
    const unit = 2 + Math.floor(19 * draw());
    const large = unit + Math.floor(7 * unit * draw());
    const terminals = Array.from({ length: 2 + Math.floor(Math.min(vertexCount - 2, 7) * draw()) },
      (_, index) => vertexCount - 1 - index);
    const dag = sample % 2 === 0;
    const arcs = [];
    for (let u = 0; u < vertexCount; u++) {
      for (let v = 1; v < vertexCount; v++) {
        if (u === v || (dag && u > v)) continue;
        if (u === 0 || draw() < 0.24) arcs.push({ u, v, cost: Math.floor(20 * draw()) });
      }
    }

    const original = Array(arcs.length).fill(0);
    for (const [index, terminal] of terminals.entries()) {
      let remaining = index === 0 ? large : unit;
      while (remaining > 0) {
        const randomOrder = [...arcs.keys()];
        for (let j = randomOrder.length - 1; j > 0; j--) {
          const swap = Math.floor((j + 1) * draw());
          [randomOrder[j], randomOrder[swap]] = [randomOrder[swap], randomOrder[j]];
        }
        const path = findPath(arcs, terminal, randomOrder);
        const amount = 1 + Math.floor(remaining * draw());
        for (const arc of path) original[arc] += amount;
        remaining -= amount;
      }
    }

    if (!dag && sample % 7 === 1) {
      const a = 1 + Math.floor((vertexCount - 1) * draw());
      const b = 1 + Math.floor((vertexCount - 1) * draw());
      const forward = arcs.findIndex(arc => arc.u === a && arc.v === b);
      const backward = arcs.findIndex(arc => arc.u === b && arc.v === a);
      if (forward >= 0 && backward >= 0) {
        original[forward] += 2;
        original[backward] += 2;
      }
    }

    const seededCheck = checkRounding(vertexCount, arcs, terminals, original, unit, large);
    totals.checked++;
    if (dag) totals.dag++;
    else totals.allowsCycles++;
    if (large % unit !== 0) totals.nonintegerRatios++;
    if (terminals.length > 2) totals.moreThanTwoTerminals++;
    if (seededCheck.costDifference !== 0) totals.nonzeroCostDifference++;

    // The ceilings of the first optimum lie within the original capacities,
    // so that flow remains optimal when it becomes the new reference flow.
    const minimumCostCheck = checkRounding(vertexCount, arcs, terminals, seededCheck.optimalFlow, unit, large);
    assert.equal(minimumCostCheck.minimumCost, seededCheck.minimumCost);
    totals.minimumCostInputs.checked++;
    if (minimumCostCheck.roundedCost === minimumCostCheck.minimumCost) {
      totals.minimumCostInputs.sameCostAfterRounding++;
    }
  }
  return totals;
}

console.log(JSON.stringify({
  publishedCounterexample: verifyPublishedInstance(),
  roundingVerification: verifySeededInstances(),
}, null, 2));
