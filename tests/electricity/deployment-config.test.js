import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../.github/workflows/pages.yml", import.meta.url),
  "utf8"
);

test("deployment uses the configured public Supabase project when secrets are absent", () => {
  assert.match(
    workflow,
    /VITE_SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \|\| 'https:\/\/hheobgjivljydirnculb\.supabase\.co' \}\}/
  );
  assert.match(
    workflow,
    /VITE_SUPABASE_ANON_KEY: \$\{\{ secrets\.SUPABASE_ANON_KEY \|\| 'sb_publishable_N26f9M2WPwiOMzHlHwoY4w_Jh1gr8GD' \}\}/
  );
});
