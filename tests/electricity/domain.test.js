import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePeriods,
  calculateReadingPreview,
  calculateUnpaidTotal,
  findPreviousReading,
  formatRubles,
  requiresPreviousReading,
  validatePreviousReading,
  validateReading
} from "../../electricity/js/domain.js";

function reading(overrides = {}) {
  return {
    id: "reading",
    reading_date: "2025-08-15",
    t1_reading: 6989,
    t2_reading: 3136,
    t1_rate: 6.25,
    t2_rate: 2.5,
    is_paid: false,
    ...overrides
  };
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

test("calculates adjacent usage and separate tariff costs", () => {
  const periods = calculatePeriods([
    reading({
      id: "new",
      reading_date: "2025-09-15",
      t1_reading: 7425,
      t2_reading: 3376,
      t1_rate: 6.43,
      t2_rate: 2.71
    }),
    reading({ id: "old" })
  ]);

  assert.equal(periods[0].isBaseline, true);
  assert.deepEqual(
    pick(periods[0], ["t1Usage", "t2Usage", "t1Cost", "t2Cost", "totalCost"]),
    { t1Usage: 0, t2Usage: 0, t1Cost: 0, t2Cost: 0, totalCost: 0 }
  );
  assert.deepEqual(
    pick(periods[1], ["t1Usage", "t2Usage", "t1Cost", "t2Cost", "totalCost"]),
    { t1Usage: 436, t2Usage: 240, t1Cost: 2803.48, t2Cost: 650.4, totalCost: 3453.88 }
  );
});

test("rounds a half-cent tariff at the scaled monetary precision", () => {
  const periods = calculatePeriods([
    reading({
      id: "old",
      t1_reading: 100,
      t2_reading: 100
    }),
    reading({
      id: "new",
      reading_date: "2025-09-15",
      t1_reading: 101,
      t2_reading: 100,
      t1_rate: 10.075
    })
  ]);

  assert.equal(periods[1].t1Cost, 10.08);
  assert.equal(periods[1].totalCost, 10.08);
});

test("rounds tariff costs around the half-cent edge before totaling", () => {
  const periods = calculatePeriods([
    reading({
      id: "old",
      t1_reading: 100,
      t2_reading: 100
    }),
    reading({
      id: "new",
      reading_date: "2025-09-15",
      t1_reading: 101,
      t2_reading: 101,
      t1_rate: 1.005,
      t2_rate: 2.0049
    })
  ]);

  assert.deepEqual(
    pick(periods[1], ["t1Cost", "t2Cost", "totalCost"]),
    { t1Cost: 1.01, t2Cost: 2, totalCost: 3.01 }
  );
});

test("produces the same periods regardless of input order", () => {
  const oldReading = reading({ id: "old" });
  const newReading = reading({
    id: "new",
    reading_date: "2025-09-15",
    t1_reading: 7425,
    t2_reading: 3376
  });

  assert.deepEqual(
    calculatePeriods([newReading, oldReading]),
    calculatePeriods([oldReading, newReading])
  );
});

test("totals only unpaid non-baseline periods", () => {
  const periods = calculatePeriods([
    reading({ id: "baseline" }),
    reading({
      id: "paid",
      reading_date: "2025-09-15",
      t1_reading: 7000,
      t2_reading: 3146,
      is_paid: true
    }),
    reading({
      id: "unpaid",
      reading_date: "2025-10-15",
      t1_reading: 7010,
      t2_reading: 3156,
      is_paid: false
    })
  ]);

  assert.equal(calculateUnpaidTotal(periods), 87.5);
});

test("formats values as Russian rubles", () => {
  assert.equal(
    formatRubles(1234.5),
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(1234.5)
  );
});

test("requires a reading date", () => {
  assert.deepEqual(validateReading(reading({ reading_date: "" }), [], null), {
    reading_date: "Reading date is required"
  });
});

test("rejects negative meter readings", () => {
  assert.deepEqual(
    validateReading(reading({ t1_reading: -1, t2_reading: -2 }), [], null),
    {
      t1_reading: "T1 reading must be zero or greater",
      t2_reading: "T2 reading must be zero or greater"
    }
  );
});

test("requires positive tariff rates", () => {
  assert.deepEqual(validateReading(reading({ t1_rate: 0, t2_rate: -1 }), [], null), {
    t1_rate: "T1 rate must be greater than zero",
    t2_rate: "T2 rate must be greater than zero"
  });
});

test("rejects duplicate dates", () => {
  const existing = reading({ id: "existing" });

  assert.deepEqual(validateReading(reading({ id: "candidate" }), [existing], null), {
    reading_date: "A reading already exists for this date"
  });
});

test("rejects values below the previous reading", () => {
  const previous = reading({ id: "previous" });
  const candidate = reading({
    id: "candidate",
    reading_date: "2025-09-15",
    t1_reading: 6988,
    t2_reading: 3135
  });

  assert.deepEqual(validateReading(candidate, [previous], null), {
    t1_reading: "T1 reading cannot be below the previous reading",
    t2_reading: "T2 reading cannot be below the previous reading"
  });
});

test("rejects edited values above the next reading", () => {
  const readings = [
    reading({ id: "previous" }),
    reading({
      id: "editing",
      reading_date: "2025-09-15",
      t1_reading: 7000,
      t2_reading: 3150
    }),
    reading({
      id: "next",
      reading_date: "2025-10-15",
      t1_reading: 7100,
      t2_reading: 3200
    })
  ];
  const candidate = reading({
    id: "editing",
    reading_date: "2025-09-15",
    t1_reading: 7101,
    t2_reading: 3201
  });

  assert.deepEqual(validateReading(candidate, readings, "editing"), {
    t1_reading: "T1 reading cannot exceed the next reading",
    t2_reading: "T2 reading cannot exceed the next reading"
  });
});

test("accepts an insertion between monotonic neighbors", () => {
  const readings = [
    reading({ id: "previous" }),
    reading({
      id: "next",
      reading_date: "2025-10-15",
      t1_reading: 7100,
      t2_reading: 3200
    })
  ];
  const candidate = reading({
    id: "candidate",
    reading_date: "2025-09-15",
    t1_reading: 7000,
    t2_reading: 3150
  });

  assert.deepEqual(validateReading(candidate, readings, null), {});
});

test("requires explicit previous values whenever the candidate has no predecessor", () => {
  const earliest = reading({ id: "earliest" });
  const later = reading({
    id: "later",
    reading_date: "2025-09-15",
    t1_reading: 7100,
    t2_reading: 3200
  });

  assert.equal(requiresPreviousReading(reading(), [], null), true);
  assert.equal(
    requiresPreviousReading(earliest, [earliest, later], "earliest"),
    true
  );
  assert.equal(
    requiresPreviousReading(later, [earliest, later], "later"),
    false
  );
  assert.equal(findPreviousReading(later, [later, earliest], "later"), earliest);
});

test("validates previous date and readings against the current candidate", () => {
  const candidate = reading({
    reading_date: "2025-08-15",
    t1_reading: 100,
    t2_reading: 200
  });

  assert.deepEqual(
    validatePreviousReading(
      {
        reading_date: "2025-08-15",
        t1_reading: -1,
        t2_reading: 201
      },
      candidate
    ),
    {
      previous_date: "Previous date must be before the current date",
      previous_t1_reading: "Previous T1 reading must be zero or greater",
      previous_t2_reading: "Previous T2 reading cannot exceed the current reading"
    }
  );
});

test("requires all previous values without assuming zero", () => {
  const candidate = reading();

  assert.deepEqual(
    validatePreviousReading(
      {
        reading_date: "",
        t1_reading: Number.NaN,
        t2_reading: Number.NaN
      },
      candidate
    ),
    {
      previous_date: "Previous date is required"
    }
  );
});

test("previews immediate usage with current tariffs from an explicit predecessor", () => {
  const previous = reading({
    id: "previous",
    reading_date: "2025-07-15",
    t1_reading: 100,
    t2_reading: 200,
    t1_rate: 999,
    t2_rate: 999
  });
  const candidate = reading({
    id: "candidate",
    t1_reading: 110,
    t2_reading: 220,
    t1_rate: 6.5,
    t2_rate: 3
  });

  assert.deepEqual(
    pick(calculateReadingPreview(candidate, previous), [
      "isBaseline",
      "t1Usage",
      "t2Usage",
      "t1Cost",
      "t2Cost",
      "totalCost"
    ]),
    {
      isBaseline: false,
      t1Usage: 10,
      t2Usage: 20,
      t1Cost: 65,
      t2Cost: 60,
      totalCost: 125
    }
  );
});
