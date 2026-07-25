const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB"
});

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sortByDate(readings) {
  return readings
    .map((reading, index) => ({ reading, index }))
    .sort(
      (left, right) =>
        left.reading.reading_date.localeCompare(right.reading.reading_date) ||
        left.index - right.index
    )
    .map(({ reading }) => reading);
}

export function calculatePeriods(readings) {
  return sortByDate(readings).map((reading, index, sortedReadings) => {
    if (index === 0) {
      return {
        ...reading,
        isBaseline: true,
        t1Usage: 0,
        t2Usage: 0,
        t1Cost: 0,
        t2Cost: 0,
        totalCost: 0
      };
    }

    const previous = sortedReadings[index - 1];
    const t1Usage = reading.t1_reading - previous.t1_reading;
    const t2Usage = reading.t2_reading - previous.t2_reading;
    const t1Cost = roundMoney(t1Usage * reading.t1_rate);
    const t2Cost = roundMoney(t2Usage * reading.t2_rate);

    return {
      ...reading,
      isBaseline: false,
      t1Usage,
      t2Usage,
      t1Cost,
      t2Cost,
      totalCost: roundMoney(t1Cost + t2Cost)
    };
  });
}

export function calculateUnpaidTotal(periods) {
  return roundMoney(
    periods
      .filter((period) => !period.is_paid)
      .reduce((total, period) => total + period.totalCost, 0)
  );
}

export function formatRubles(value) {
  return rubleFormatter.format(value);
}

export function validateReading(candidate, readings, editingId) {
  const errors = {};
  const remainingReadings = readings.filter((reading) => reading.id !== editingId);

  if (!candidate.reading_date) {
    errors.reading_date = "Reading date is required";
  } else if (
    remainingReadings.some((reading) => reading.reading_date === candidate.reading_date)
  ) {
    errors.reading_date = "A reading already exists for this date";
  }

  if (candidate.t1_reading < 0) {
    errors.t1_reading = "T1 reading must be zero or greater";
  }
  if (candidate.t2_reading < 0) {
    errors.t2_reading = "T2 reading must be zero or greater";
  }
  if (candidate.t1_rate <= 0) {
    errors.t1_rate = "T1 rate must be greater than zero";
  }
  if (candidate.t2_rate <= 0) {
    errors.t2_rate = "T2 rate must be greater than zero";
  }

  const orderedReadings = sortByDate([...remainingReadings, candidate]);
  const candidateIndex = orderedReadings.indexOf(candidate);
  const previous = orderedReadings[candidateIndex - 1];
  const next = orderedReadings[candidateIndex + 1];

  if (previous) {
    if (!errors.t1_reading && candidate.t1_reading < previous.t1_reading) {
      errors.t1_reading = "T1 reading cannot be below the previous reading";
    }
    if (!errors.t2_reading && candidate.t2_reading < previous.t2_reading) {
      errors.t2_reading = "T2 reading cannot be below the previous reading";
    }
  }

  if (next) {
    if (!errors.t1_reading && candidate.t1_reading > next.t1_reading) {
      errors.t1_reading = "T1 reading cannot exceed the next reading";
    }
    if (!errors.t2_reading && candidate.t2_reading > next.t2_reading) {
      errors.t2_reading = "T2 reading cannot exceed the next reading";
    }
  }

  return errors;
}
