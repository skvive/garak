/** Offline only: npx tsx scripts/forecast-demand.ts <trusted-sales.json> */
import { readFileSync } from 'node:fs';
import { forecastDemand, type SaleDay, type ForecastOptions } from '../src/lib/catalog/demand-forecast';
const input = process.argv[2];
if (!input) { console.error('Usage: npx tsx scripts/forecast-demand.ts <trusted-sales.json>'); process.exit(2); }
const payload = JSON.parse(readFileSync(input, 'utf8')) as { days: SaleDay[]; options?: ForecastOptions };
if (!payload || !Array.isArray(payload.days)) throw new Error('Input JSON must contain an array named days');
console.log(JSON.stringify(forecastDemand(payload.days, payload.options), null, 2));
