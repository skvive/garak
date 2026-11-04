import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectShortsJob, assertShortsJob } from './preflight.mjs';
const job={id:'s1',strategy:'remotion',script:{hookText:'신선한 수산물',cta:'확인하세요',scenes:[{overlayText:'테스트',duration:3,imageIndex:0}]},product:{imageUrls:['https://cdn.example.com/img.webp']}};
test('good job passes schema and HTTPS',()=>assert.equal(inspectShortsJob(job).ok,true));
test('empty images blocked before blank video',()=>assert.equal(inspectShortsJob({...job,product:{imageUrls:[]}}).ok,false));
test('internal addresses rejected',()=>assert.equal(inspectShortsJob({...job,product:{imageUrls:['https://127.0.0.1/img.jpg']}}).ok,false));
test('IPv6 local URLs are blocked',()=>assert.equal(inspectShortsJob({...job,product:{imageUrls:['https://[::1]/img.jpg']}}).ok,false));
test('insecure URL rejected',()=>assert.equal(inspectShortsJob({...job,product:{imageUrls:['http://example.com/a.jpg']}}).ok,false));
test('explicitly denied rights rejected',()=>assert.equal(inspectShortsJob({...job,mediaRightsApproved:false}).ok,false));
test('strict rights approval is opt-in',()=>{
 assert.equal(inspectShortsJob(job,{strictRights:true}).ok,false);
 assert.equal(inspectShortsJob({...job,mediaRightsApproved:true},{strictRights:true}).ok,true);
});
test('unsafe wan video URL rejected',()=>assert.equal(inspectShortsJob({...job,strategy:'wan_i2v',wanVideoUrl:'https://localhost/video.mp4'}).ok,false));
test('error reports are actionable',()=>assert.throws(()=>assertShortsJob(null),/missing job/));
