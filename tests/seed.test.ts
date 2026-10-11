import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSize, interleave, seedScore, shuffle } from "../src/lib/seed.ts";

test("defaultSize elige la potencia de 2 que alcanza", () => {
  assert.equal(defaultSize(0), 8);
  assert.equal(defaultSize(8), 8);
  assert.equal(defaultSize(9), 16);
  assert.equal(defaultSize(33), 64);
  assert.equal(defaultSize(200), 64);
});

test("shuffle con semilla es repetible y conserva los elementos", () => {
  const xs = Array.from({ length: 20 }, (_, i) => i);
  assert.deepEqual(shuffle(xs, 7), shuffle(xs, 7));
  assert.notDeepEqual(shuffle(xs, 7), shuffle(xs, 8));
  assert.deepEqual([...shuffle(xs, 7)].sort((a, b) => a - b), xs);
});

test("interleave alterna y no pierde elementos", () => {
  assert.deepEqual(interleave([1, 2, 3], ["a"]), [1, "a", 2, 3]);
  assert.deepEqual(interleave([], []), []);
});

test("seedScore no deja que pocos votos ganen", () => {
  assert.ok(seedScore({ rating: 8.4, votes: 20000 }) > seedScore({ rating: 9.0, votes: 12 }));
});
