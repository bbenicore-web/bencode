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
