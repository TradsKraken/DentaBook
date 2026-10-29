const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../app");

async function requestWithPool(pool, path) {
  const server = createApp(pool, { logger: { error() {} } }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
    );
    return { status: response.status, data: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test("directory returns database records and restricts queries to approved clinics and active public profiles", async () => {
  const result = await requestWithPool(
    {
      query: async (sql) => {
        assert.match(sql, /c.status = 'approved'/);
        assert.match(sql, /s.is_active = TRUE/);
        assert.match(sql, /d.is_active = TRUE/);
        assert.doesNotMatch(sql, /password_hash|patient_email|medical_notes/);
        return {
          rows: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "Directory Test Clinic",
              services: [],
              dentists: [],
            },
          ],
        };
      },
    },
    "/api/clinics",
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.clinics[0].name, "Directory Test Clinic");
});
test("an empty database produces an empty directory without fallback listings", async () => {
  const result = await requestWithPool(
    { query: async () => ({ rows: [] }) },
    "/api/clinics",
  );
  assert.deepEqual(result, { status: 200, data: { clinics: [] } });
});
test("invalid clinic IDs do not reach the database", async () => {
  const result = await requestWithPool(
    {
      query: async () => {
        throw new Error("Must not query");
      },
    },
    "/api/clinics/not-a-uuid",
  );
  assert.equal(result.status, 404);
});
test("profile lookups are parameterized and unavailable clinics return 404", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const result = await requestWithPool(
    {
      query: async (sql, values) => {
        assert.match(sql, /c.status = 'approved' AND c.id = \$1/);
        assert.deepEqual(values, [id]);
        return { rows: [] };
      },
    },
    `/api/clinics/${id}`,
  );
  assert.equal(result.status, 404);
});
test("database failures return a safe error without connection details", async () => {
  const result = await requestWithPool(
    {
      query: async () => {
        throw new Error("sensitive connection details");
      },
    },
    "/api/clinics",
  );
  assert.equal(result.status, 503);
  assert.doesNotMatch(JSON.stringify(result.data), /sensitive|password|stack/);
});
