const { spawnSync } = require("node:child_process");

const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "test/api.routes.integration.test.js"], {
  stdio: "inherit",
  env: { ...process.env, RUN_ROUTE_AUDIT: "1" }
});

process.exitCode = result.status || 0;
