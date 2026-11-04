/** Read-only daily demand forecast for Garak seller stock planning.
 * Every input must be a real paid daily quantity for one merchant and SKU.
 * Missing days must be explicitly recorded as zero (not silently interpolated).
 */
export interface SaleDay { date: string; quantity: number }
export interface DemandForecast {
  status: 'insufficient_data' | 'estimate';
  reason?: string;
  observedDays: number;
  horizonDays: number;
  dailyEstimate: number;
  forecastUnits: number;
  backtestWape: number | null;
  reorderSuggestion: number | null;
  method: 'weekday_recency_baseline';
}
export interface ForecastOptions {
  horizonDays?: number;
  verifiedOnHand?: number;
  leadDays?: number;
  safetyDays?: number;
}
const DAY_MS = 86_400_000;
function parseDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('date must be YYYY-MM-DD');
  const n = Date.parse(value+'T00:00:00Z');
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10)!==value)
    throw new Error('invalid calendar date');
  return n;
}
const round = (x:number) => Math.round(x * 1000) / 1000;
function estimate(history: SaleDay[], targetDay:number):number {
  const recent = history.slice(-28);
  const values = recent.map(x=>x.quantity).sort((a,b)=>a-b);
  const cap = values[Math.min(values.length-1, Math.floor((values.length-1)*0.9))];
  const clipped = recent.map(x=>Math.min(x.quantity,cap));
  let smooth=clipped[0];
  for (const x of clipped.slice(1)) smooth = 0.3*x + 0.7*smooth;
  const weekday = new Date(targetDay).getUTCDay();
  const same = recent.filter(x=>new Date(parseDay(x.date)).getUTCDay()===weekday)
    .map(x=>Math.min(x.quantity,cap));
  const weekdayEstimate = same.reduce((a,b)=>a+b,0)/Math.max(same.length,1);
  return Math.max(0,0.65*smooth+0.35*weekdayEstimate);
}
export function forecastDemand(days: SaleDay[], options: ForecastOptions = {}): DemandForecast {
  const horizon=options.horizonDays ?? 7, lead=options.leadDays ?? 3, safety=options.safetyDays ?? 2;
  if (!Number.isInteger(horizon)||horizon<1||horizon>30) throw new Error('horizonDays 1..30');
  if (!Number.isInteger(lead)||lead<1||lead>30||!Number.isInteger(safety)||safety<0||safety>30)
    throw new Error('invalid lead/safety days');
  if (options.verifiedOnHand !== undefined && (!Number.isInteger(options.verifiedOnHand)||options.verifiedOnHand<0))
    throw new Error('verifiedOnHand must be non-negative integer');
  const sorted=days.map(x=>({date:x.date,quantity:x.quantity,day:parseDay(x.date)})).sort((a,b)=>a.day-b.day);
  for(let i=0;i<sorted.length;i++) {
    if(!Number.isInteger(sorted[i].quantity)||sorted[i].quantity<0)
      throw new Error('daily paid quantity must be non-negative integer');
    if(i&&sorted[i].day!==sorted[i-1].day+DAY_MS)
      throw new Error('days must be continuous, with explicit 0-sale days and no duplicates');
  }
  const base={observedDays:sorted.length,horizonDays:horizon,method:'weekday_recency_baseline' as const};
  if(sorted.length<14)
    return {...base,status:'insufficient_data',reason:'At least 14 consecutive actual sales days are required',
      dailyEstimate:0,forecastUnits:0,backtestWape:null,reorderSuggestion:null};
  const history=sorted.map(({date,quantity})=>({date,quantity}));
  let total=0;
  const last=sorted.at(-1)!.day;
  for(let h=1;h<=horizon;h++) total+=estimate(history,last+h*DAY_MS);
  const forecastUnits=Math.ceil(total);
  let backtestWape:null|number=null;
  if(sorted.length>=21) {
    let absError=0, actual=0;
    for(let i=sorted.length-7;i<sorted.length;i++) {
      const prediction=estimate(history.slice(0,i),sorted[i].day);
      absError+=Math.abs(prediction-sorted[i].quantity);
      actual+=sorted[i].quantity;
    }
    backtestWape=actual>0?round(absError/actual):null;
  }
  const reorderSuggestion=options.verifiedOnHand===undefined?null:
    Math.max(0,Math.ceil((total/horizon)*(lead+safety))-options.verifiedOnHand);
  return {...base,status:'estimate',dailyEstimate:round(total/horizon),forecastUnits,backtestWape,reorderSuggestion};
}
