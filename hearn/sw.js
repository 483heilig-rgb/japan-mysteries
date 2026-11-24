'use strict';
const VERSION='hearn-album-v4';
const BASE=new URL('./',self.location.href);
const CORE=['./','index.html','style.css','app.js','data.js','icon.svg','manifest.webmanifest','assets/matsue-dusk.webp','assets/portrait.jpg','assets/setsu.webp','assets/house.webp','assets/hoichi.webp'];
const EXTRA=['assets/audio/intro.mp3','assets/audio/japan.mp3','assets/audio/setsu.mp3','assets/audio/story-hoichi.mp3','assets/audio/story-snow.mp3','assets/audio/story-mujina.mp3','../atlas/assets/yokai-04.jpg','../atlas/assets/yokai-10.jpg','../atlas/assets/audio/rain-window.mp3'];
const urls=paths=>paths.map(p=>new URL(p,BASE).href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(urls(CORE))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hearn-album-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const request=e.request;
 if(request.mode==='navigate'){
  e.respondWith(fetch(request).then(async r=>{if(r.ok){const cache=await caches.open(VERSION);await cache.put(request,r.clone())}return r}).catch(async()=>await caches.match(request)||await caches.match(new URL('index.html',BASE).href)));return;
 }
 // Let the browser handle range requests for streamed audio.
 if(request.headers.has('range')){
  e.respondWith(caches.match(request.url).then(async r=>{
   if(!r)return fetch(request);
   const buffer=await r.arrayBuffer();const match=/bytes=(\d+)-(\d*)/.exec(request.headers.get('range'));
   if(!match)return r;const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),buffer.byteLength-1):buffer.byteLength-1;
   if(start> end||start>=buffer.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${buffer.byteLength}`}});
   return new Response(buffer.slice(start,end+1),{status:206,headers:{'Content-Type':r.headers.get('Content-Type')||'audio/mpeg','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${buffer.byteLength}`,'Accept-Ranges':'bytes'}});
  }));return;
 }
 e.respondWith(caches.match(request).then(r=>r||fetch(request).then(async response=>{if(response.ok){const c=await caches.open(VERSION);await c.put(request,response.clone())}return response})));
});
self.addEventListener('message',e=>{if(e.data?.type!=='CACHE_ALL')return;e.waitUntil((async()=>{try{const cache=await caches.open(VERSION);await cache.addAll(urls([...CORE,...EXTRA]));e.ports[0]?.postMessage({ok:true})}catch{e.ports[0]?.postMessage({ok:false})}})())});
