import {pickAmbaCast, listAmbaCasts} from '../src/lib/pdp/amba-casts';
try {
  const all = listAmbaCasts();
  console.log('Total casts:', all.length);
  console.log('First:', all[0]?.id, all[0]?.name, all[0]?.source?.sex);
  const f = pickAmbaCast({sex: 'F'});
  console.log('F pick:', f?.id, f?.name || 'N/A', 'sex:', f?.source?.sex);
  const m = pickAmbaCast({sex: 'M'});
  console.log('M pick:', m?.id, m?.name || 'N/A', 'sex:', m?.source?.sex);
} catch(e) {
  console.error('ERROR:', String(e));
}