import assert from "node:assert/strict";
import { test } from "node:test";
import {
  champion,
  clearWinner,
  createBracket,
  nextMatch,
  pickWinner,
  progress,
  roundName,
  seedOrder,
  undoLast,
} from "../src/lib/bracket.ts";

const names = (n: number) => Array.from({ length: n }, (_, i) => `m${i + 1}`);

test("seedOrder separa a los mejores", () => {
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.equal(new Set(seedOrder(64)).size, 64);
  assert.throws(() => seedOrder(12));
});

test("createBracket arma N-1 partidos y valida", () => {
  for (const n of [2, 4, 8, 16, 32, 64]) {
    assert.equal(progress(createBracket(names(n))).total, n - 1);
  }
  assert.throws(() => createBracket(names(6)));
  assert.throws(() => createBracket(["a", "a", "b", "c"]));
});

test("el ganador avanza a la ronda siguiente", () => {
  let b = createBracket(names(4));
  b = pickWinner(b, 0, 0, "m1");
  b = pickWinner(b, 0, 1, "m4");
  assert.deepEqual(b.rounds[1][0], { a: "m1", b: "m4", winner: null });
  assert.deepEqual(nextMatch(b), { round: 1, index: 0 });
  b = pickWinner(b, 1, 0, "m4");
  assert.equal(champion(b), "m4");
  assert.equal(nextMatch(b), null);
  assert.deepEqual(progress(b), { played: 3, total: 3 });
});

test("no se puede elegir a quien no juega", () => {
  const b = createBracket(names(4));
  assert.throws(() => pickWinner(b, 0, 0, "m3"));
  assert.throws(() => pickWinner(b, 5, 0, "m1"));
});

test("cambiar un voto borra lo que dependía de él", () => {
  let b = createBracket(names(4));
  b = pickWinner(b, 0, 0, "m1");
  b = pickWinner(b, 0, 1, "m3");
  b = pickWinner(b, 1, 0, "m1");
  assert.equal(champion(b), "m1");

  b = pickWinner(b, 0, 0, "m2");
  assert.equal(champion(b), null);
  assert.deepEqual(b.rounds[1][0], { a: "m2", b: "m3", winner: null });
});

test("repetir el mismo voto no cambia nada", () => {
  let b = createBracket(names(4));
  b = pickWinner(b, 0, 0, "m1");
  assert.equal(pickWinner(b, 0, 0, "m1"), b);
});

test("clearWinner deshace en cascada", () => {
  // partidos de la ronda 1: m1-m2, m3-m4, m5-m6, m7-m8
  let b = createBracket(names(8));
  for (const [i, w] of [[0, "m1"], [1, "m3"], [2, "m5"], [3, "m7"]] as const) b = pickWinner(b, 0, i, w);
  b = pickWinner(b, 1, 0, "m1");
  b = pickWinner(b, 1, 1, "m5");
  b = pickWinner(b, 2, 0, "m1");
  assert.equal(champion(b), "m1");

  b = clearWinner(b, 0, 0);
  assert.equal(champion(b), null);
  assert.deepEqual(b.rounds[1][0], { a: null, b: "m3", winner: null });
  assert.deepEqual(b.rounds[2][0], { a: null, b: "m5", winner: null });
  // lo que no dependía de ese partido queda igual
  assert.equal(b.rounds[1][1].winner, "m5");
  assert.equal(b.rounds[0][1].winner, "m3");
});

test("nombres de ronda", () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, r) => roundName(createBracket(names(64)), r)),
    ["32avos de final", "16avos de final", "Octavos de final", "Cuartos de final", "Semifinales", "Final"],
  );
});

test("undoLast deshace el último voto y en orden", () => {
  let b = createBracket(names(4));
  b = pickWinner(b, 0, 0, "m1");
  b = pickWinner(b, 0, 1, "m3");
  b = undoLast(b);
  assert.equal(b.rounds[0][1].winner, null);
  assert.equal(b.rounds[1][0].b, null);
  assert.equal(b.rounds[0][0].winner, "m1");
  b = undoLast(b);
  assert.equal(progress(b).played, 0);
  assert.equal(undoLast(b), b);
});
