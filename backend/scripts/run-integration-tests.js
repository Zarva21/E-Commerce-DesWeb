// Las pruebas integrales escriben datos QA-AUTO y los eliminan al finalizar.
const { spawnSync } = require("node:child_process");

const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "test/api.integration.test.js"], {
  stdio: "inherit",
  env: { ...process.env, RUN_INTEGRATION: "1" }
});

process.exitCode = result.status || 0;
