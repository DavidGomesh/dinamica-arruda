import test from "node:test";
import assert from "node:assert/strict";

import { createTimestamp } from "../js/domain/time.js";

test("cronologia registra instante UTC, fuso e deslocamento observados", () => {
  const timestamp = createTimestamp({
    now: () => new Date("2026-08-08T12:34:56.000Z"),
    timeZone: () => "America/Fortaleza",
    offsetMinutes: () => -180,
  });

  assert.deepEqual(timestamp, {
    instant: "2026-08-08T12:34:56.000Z",
    timeZone: "America/Fortaleza",
    offsetMinutes: -180,
  });
});
