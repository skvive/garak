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


test('public IP literal and hexadecimal localhost addresses rejected', () => {
  for (const host of ['172.17.0.1','100.100.100.200','192.168.0.2','0x7f000001']) {
    const candidate={...job,product:{imageUrls:[`https://${host}/a.jpg`]}};
    assert.equal(inspectShortsJob(candidate).ok,false,host);
  }
});
test('embedded credential, non-standard HTTPS ports and intranet-only hostname rejected',()=>{
  for (const url of ['https://user:pass@cdn.example.com/a','https://cdn.example.com:8443/a','https://privatebox/a']) {
    assert.equal(inspectShortsJob({...job,product:{imageUrls:[url]}}).ok,false,url);
  }
});
test('media allowlist uses exact host not suffix',()=>{
  assert.equal(inspectShortsJob(job,{allowMediaHosts:['cdn.example.com']}).ok,true);
  assert.equal(inspectShortsJob(job,{allowMediaHosts:['example.com']}).ok,false);
  assert.equal(inspectShortsJob({...job,product:{imageUrls:['https://cdn.example.com.evil.test/a']}},{allowMediaHosts:['cdn.example.com']}).ok,false);
});
test('wan video host must be present in same allowlist',()=>{
  const wan={...job,strategy:'wan_i2v',wanVideoUrl:'https://video.example.com/v.mp4'};
  assert.equal(inspectShortsJob(wan,{allowMediaHosts:['cdn.example.com']}).ok,false);
});
