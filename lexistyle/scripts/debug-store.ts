import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync } from "fs";
import path from "path";
import os from "os";

const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const store = JSON.parse(readFileSync(STORE, "utf8"));

const cat = (store.catalog ?? []).find((c: any) => c.id === 500);
if (cat) {
  console.log("Found catalog id=500:");
  console.log(JSON.stringify(cat, null, 2).slice(0, 500));
} else {
  console.log("id=500 not found. Checking first catalog entry keys:");
  const first = (store.catalog ?? [])[0];
  if (first) {
    console.log("Keys:", Object.keys(first));
    console.log("First entry:", JSON.stringify(first, null, 2).slice(0, 500));
  } else {
    console.log("No catalog entries found. Checking store keys:", Object.keys(store));
  }
}