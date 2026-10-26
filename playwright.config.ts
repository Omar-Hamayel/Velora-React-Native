import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir:"./tests/e2e", timeout:180000, workers:1, retries:0,
  use:{baseURL:"http://127.0.0.1:18082",channel:"msedge",headless:true,viewport:{width:430,height:932},trace:"off",screenshot:"only-on-failure"},
  reporter:[["list"],["json",{outputFile:"test-results/e2e-results.json"}]] });
