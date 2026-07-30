const READING_FIELDS = [
  "reading_date",
  "t1_reading",
  "t2_reading",
  "t1_rate",
  "t2_rate"
];

function persistedReadingInput(input) {
  return Object.fromEntries(READING_FIELDS.map((field) => [field, input[field]]));
}

async function dataOrThrow(query) {
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export function createReadingsRepository(client) {
  return {
    list(userId) {
      return dataOrThrow(
        client
          .from("electricity_readings")
          .select()
          .eq("user_id", userId)
          .order("reading_date", { ascending: true })
      );
    },

    create(userId, input) {
      return dataOrThrow(
        client
          .from("electricity_readings")
          .insert({
            user_id: userId,
            ...persistedReadingInput(input),
            is_paid: false
          })
          .select()
          .single()
      );
    },

    saveWithBaseline({ currentId = null, previous, current }) {
      const persistedCurrent = persistedReadingInput(current);

      return dataOrThrow(
        client.rpc("save_electricity_reading_with_baseline", {
          p_current_id: currentId,
          p_previous_date: previous.reading_date,
          p_previous_t1_reading: previous.t1_reading,
          p_previous_t2_reading: previous.t2_reading,
          p_reading_date: persistedCurrent.reading_date,
          p_t1_reading: persistedCurrent.t1_reading,
          p_t2_reading: persistedCurrent.t2_reading,
          p_t1_rate: persistedCurrent.t1_rate,
          p_t2_rate: persistedCurrent.t2_rate
        })
      );
    },

    update(userId, id, input) {
      return dataOrThrow(
        client
          .from("electricity_readings")
          .update(persistedReadingInput(input))
          .eq("user_id", userId)
          .eq("id", id)
          .select()
          .single()
      );
    },

    remove(userId, id) {
      return dataOrThrow(
        client
          .from("electricity_readings")
          .delete()
          .eq("user_id", userId)
          .eq("id", id)
          .select()
          .single()
      );
    },

    setPaid(userId, id, isPaid) {
      return dataOrThrow(
        client
          .from("electricity_readings")
          .update({ is_paid: isPaid })
          .eq("user_id", userId)
          .eq("id", id)
          .select()
          .single()
      );
    }
  };
}
