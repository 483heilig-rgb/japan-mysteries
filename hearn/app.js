'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOURCE_IDS=Object.keys(HEARN.sources),BOOK_IDS=HEARN.books.map(b=>b.id);
function stored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
const initialSaved=stored('hearn-reading',[]),initialVisited=stored('hearn-journey',[]);
let saved=new Set(Array.isArray(initialSaved)?initialSaved.filter(id=>BOOK_IDS.includes(id)):[]);
let visited=new Set(Array.isArray(initialVisited)?initialVisited.filter(i=>Number.isInteger(i)&&i>=0&&i<HEARN.journey.length):[]);
let selectedJourney=0,selectedJapan=0,selectedMethod='oral',bookFilter='Все книги',activeStory=null,spoilerOpen=false;
let ambient=null,soundOn=false,toastTimer=null,modalReturn=null;
const filters=['Все книги','До Японии','Японская жизнь','Истории и вера','Мой список'];
const colors={coral:'#9c4e37',green:'#47654c',blue:'#24576a',orange:'#ab683d',violet:'#5d4a68',red:'#8f493d',teal:'#286364'};
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3400)}
function sourceButton(ids,label='Источники'){return `<button type="button" class="source-button" data-sources="${ids.join(',')}">${label}</button>`}
function sourceList(ids){return ids.filter(id=>SOURCE_IDS.includes(id)).map(id=>{const s=HEARN.sources[id];return `<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><p>${esc(s.note)}</p></div>`}).join('')}
function openModal(content){
 modalReturn=document.activeElement;pauseNarration();$('modalContent').innerHTML=content;
 if(!$('modal').open)$('modal').showModal();$('modal').scrollTop=0;
}
function showSources(ids){openModal(`<div class="modal-pad"><p class="eyebrow coral">Проверить факты</p><h2 id="modalTitle">Откуда мы это знаем</h2>${sourceList(ids)}</div>`)}
function markJourney(i){visited.add(i);persist('hearn-journey',[...visited]);}
function renderJourney(i=selectedJourney){
 selectedJourney=i;const j=HEARN.journey[i];markJourney(i);
 document.querySelectorAll('[data-journey]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.journey)===i));b.querySelector('.visited-mark').hidden=!visited.has(Number(b.dataset.journey))});
 $('journeyPanel').innerHTML=`<div class="journey-symbol" aria-hidden="true">${j.symbol}</div><div><p class="panel-kicker">${esc(j.year)} · ${esc(j.jp)}</p><h3>${esc(j.title)}</h3><p>${esc(j.text)}</p>${sourceButton(j.sources,'Основано на источниках')}</div>`;
}
function renderJapan(i=selectedJapan){
 selectedJapan=i;const j=HEARN.japan[i];
 document.querySelectorAll('[data-japan]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.japan)===i)));
 const label=i===0?'Дом Хирна в Мацуэ · фото 2019 года':i===2?'Хирн в 1889 году · фото, не снимок периода Кобэ':'Атмосферная иллюстрация · не изображение этого города';
 $('japanPanel').innerHTML=`<figure class="${i===2?'portrait':''}"><img src="${esc(j.image)}" alt="${esc(label)}" loading="lazy"><figcaption>${esc(label)}</figcaption></figure><div class="japan-copy"><p class="panel-kicker">${esc(j.years)} · ${esc(j.jp)}</p><h3>${esc(j.title)}</h3><p>${esc(j.text)}</p><p class="japan-detail">${esc(j.detail)}</p>${sourceButton(j.sources)}</div>`;
}
const methods={
 oral:'<p><strong>Живые голоса.</strong> Сэцу рассказывала Хирну истории, но не была единственным источником. В предисловии к «Кайдану» он, например, связывает «Юки-онна» с рассказом крестьянина из Тёфу.</p>',
 books:'<p><strong>Старые книги.</strong> В предисловии к «Кайдану» Хирн прямо перечисляет японские сборники, из которых взял многие сюжеты. Устные рассказы и письменные источники соседствуют в одной книге.</p>',
 retell:'<p><strong>Литература на английском.</strong> Это не дословная запись всех услышанных слов. Хирн превращал заимствованный сюжет в собственный литературный рассказ. Поэтому здесь мы различаем предание, его версию и наш краткий пересказ.</p>'
};
function renderMethod(method){if(!methods[method])return;selectedMethod=method;$('methodText').innerHTML=methods[method];document.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.method===method)))}
function renderBooks(){
 document.querySelectorAll('[data-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.filter===bookFilter));if(b.dataset.filter==='Мой список')b.textContent=`Мой список (${saved.size})`});
 const books=HEARN.books.filter(b=>bookFilter==='Все книги'||b.kind===bookFilter||(bookFilter==='Мой список'&&saved.has(b.id)));
 $('bookGrid').innerHTML=books.length?books.map(b=>`<article class="book-card"><div class="book-cover" style="--bookcolor:${colors[b.color]}"><div class="book-meta"><span>${b.year}</span><span>Книжная карточка</span></div><h3 lang="en">${esc(b.title)}</h3><span class="book-author">LAFCADIO HEARN</span></div><div class="book-body"><h4 class="book-ru">${esc(b.ru)}</h4><p>${esc(b.blurb)}</p><div class="book-actions"><a href="${esc(HEARN.sources[b.source].url)}" target="_blank" rel="noopener">${b.source==='america'?'О книге':'Текст на английском'}</a><button type="button" class="save-book" data-save="${b.id}" aria-pressed="${saved.has(b.id)}" aria-label="${saved.has(b.id)?'Убрать из списка':'Добавить в список'}: ${esc(b.title)}">${saved.has(b.id)?'✓ В моём списке':'+ Почитать'}</button></div></div></article>`).join(''):'<div class="empty-books">Здесь появятся книги, которые ты отметишь кнопкой «Почитать».</div>';
}
function toggleBook(id){if(!BOOK_IDS.includes(id))return;if(saved.has(id))saved.delete(id);else saved.add(id);const ok=persist('hearn-reading',[...saved]);const focusId=id;renderBooks();document.querySelector(`[data-save="${focusId}"]`)?.focus({preventScroll:true});toast(ok?'Список чтения обновлён':'Список работает до закрытия вкладки: сохранение в браузере недоступно')}
function showStory(id){
 const s=HEARN.stories.find(s=>s.id===id);if(!s)return;activeStory=id;spoilerOpen=false;
 openModal(`<article class="story-modal"><div class="story-modal-art"><img src="${esc(s.image)}" alt="Современная иллюстрация к истории ${esc(s.title)}"></div><div class="story-modal-body"><p class="eyebrow">Kwaidan · 1904 · ${esc(s.jp)}</p><h2 id="modalTitle">${esc(s.title)}</h2><p>${esc(s.teaser)}</p><audio controls preload="none" src="assets/audio/story-${s.id}.mp3" aria-label="Послушать завязку: ${esc(s.title)}"></audio><p class="audio-note">Озвучка завязки · без развязки</p><button type="button" class="spoiler-button" id="spoilerButton" aria-expanded="false" aria-controls="storyEnding">Открыть развязку</button><div id="storyEnding" class="story-ending" hidden><p>${esc(s.ending)}</p><div class="story-lens"><strong>Наше прочтение</strong><p>${esc(s.lens)}</p></div></div><p class="story-note">${esc(s.note)}</p>${sourceButton(['kwaidan'],'Книга и источники сюжета')}</div></article>`);
}
function toggleSpoiler(){if(!activeStory)return;spoilerOpen=!spoilerOpen;$('storyEnding').hidden=!spoilerOpen;$('spoilerButton').setAttribute('aria-expanded',String(spoilerOpen));$('spoilerButton').textContent=spoilerOpen?'Скрыть развязку':'Открыть развязку'}
function pauseNarration(){document.querySelectorAll('audio').forEach(a=>a.pause());setAmbientVolume()}
function setAmbientVolume(){if(!ambient)return;const speaking=[...document.querySelectorAll('audio')].some(a=>!a.paused&&!a.ended);ambient.volume=speaking?.08:.3}
async function playNarration(key){
 const allowed={intro:'Первое знакомство с Хирном',japan:'Японский период',setsu:'Коидзуми Сэцу'};if(!allowed[key])return;
 pauseNarration();const a=$('narration');$('audioTitle').textContent=allowed[key];$('audioPlayer').hidden=false;a.src=`assets/audio/${key}.mp3`;
 try{await a.play()}catch{toast('Запись не включилась. Нажми воспроизведение в проигрывателе.')}
}
async function toggleSound(){
 if(soundOn){ambient.pause();soundOn=false;updateSound();return}
 if(!ambient){ambient=new Audio('../atlas/assets/audio/rain-window.mp3');ambient.loop=true;ambient.preload='none'}setAmbientVolume();$('soundToggle').disabled=true;
 try{await ambient.play();soundOn=true;updateSound()}catch{toast('Дождь не загрузился. Можно попробовать ещё раз.')}finally{$('soundToggle').disabled=false}
}
function updateSound(){$('soundToggle').setAttribute('aria-pressed',String(soundOn));$('soundToggle').setAttribute('aria-label',soundOn?'Выключить дождь':'Включить дождь');$('soundToggle').innerHTML=`<span aria-hidden="true">${soundOn?'◉':'◌'}</span><span>${soundOn?'Дождь включён':'Атмосфера'}</span>`}
$('journeyStops').innerHTML=HEARN.journey.map((j,i)=>`<button type="button" class="journey-stop" data-journey="${i}" aria-pressed="false"><span class="year">${esc(j.year)}</span><strong>${esc(j.place)}</strong><span class="visited-mark" aria-label="Открыто" hidden>✓</span></button>`).join('');
$('japanTabs').innerHTML=HEARN.japan.map((j,i)=>`<button type="button" class="japan-tab" data-japan="${i}" aria-pressed="false">${esc(j.name)}<span lang="ja" aria-hidden="true">${esc(j.jp)}</span></button>`).join('');
$('bookFilters').innerHTML=filters.map(f=>`<button type="button" data-filter="${f}" aria-pressed="false">${f}</button>`).join('');
$('storyGrid').innerHTML=HEARN.stories.map(s=>`<article class="story-card"><button type="button" data-story="${s.id}" aria-label="Открыть историю ${esc(s.title)}"><div class="story-art"><img src="${esc(s.image)}" alt="Современная иллюстрация к истории ${esc(s.title)}" loading="lazy"><span class="story-kana" lang="ja" aria-hidden="true">${esc(s.jp)}</span></div><div class="story-body"><h3>${esc(s.title)}</h3><p>${esc(s.tag)}</p><span class="open-story">Приоткрыть дверь</span></div></button></article>`).join('');
$('allSources').innerHTML=sourceList(SOURCE_IDS);
renderJourney();renderJapan();renderMethod('oral');renderBooks();
document.addEventListener('click',e=>{
 const j=e.target.closest('[data-journey]');if(j){renderJourney(Number(j.dataset.journey));return}
 const p=e.target.closest('[data-japan]');if(p){renderJapan(Number(p.dataset.japan));return}
 const m=e.target.closest('[data-method]');if(m){renderMethod(m.dataset.method);return}
 const f=e.target.closest('[data-filter]');if(f){bookFilter=f.dataset.filter;renderBooks();return}
 const s=e.target.closest('[data-save]');if(s){toggleBook(s.dataset.save);return}
 const story=e.target.closest('[data-story]');if(story){showStory(story.dataset.story);return}
 const src=e.target.closest('[data-sources]');if(src){showSources(src.dataset.sources.split(','));return}
 const aud=e.target.closest('[data-audio]');if(aud){playNarration(aud.dataset.audio);return}
 if(e.target.closest('#spoilerButton'))toggleSpoiler();
});
$('closeModal').addEventListener('click',()=>$('modal').close());
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').close()});
$('modal').addEventListener('close',()=>{pauseNarration();if(modalReturn?.isConnected)modalReturn.focus({preventScroll:true})});
$('closeAudio').addEventListener('click',()=>{$('narration').pause();$('audioPlayer').hidden=true});
$('soundToggle').addEventListener('click',toggleSound);
document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO'){document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()});setAmbientVolume()}},true);
document.addEventListener('pause',setAmbientVolume,true);document.addEventListener('ended',setAmbientVolume,true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)ambient?.pause();else if(soundOn)ambient?.play().catch(()=>{soundOn=false;updateSound()})});
window.addEventListener('pagehide',()=>{pauseNarration();ambient?.pause()});
const navLinks=[...document.querySelectorAll('.desktop-nav a,.mobile-nav a')];
if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)navLinks.forEach(a=>a.classList.toggle('current',a.hash==='#'+e.target.id))},{rootMargin:'-12% 0px -55% 0px'});document.querySelectorAll('main section[id]').forEach(s=>obs.observe(s))}
let scrollFrame=false;
function updateReading(){const total=document.documentElement.scrollHeight-innerHeight;$('readingLine').style.width=(total>0?Math.min(100,scrollY/total*100):0)+'%'}
window.addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(()=>{updateReading();scrollFrame=false})}},{passive:true});window.addEventListener('resize',updateReading);updateReading();
async function prepareOffline(){
 const b=$('offlineButton'),status=$('offlineStatus');b.disabled=true;status.textContent='Сохраняем страницу, иллюстрации и записи…';
 try{
  if(!('serviceWorker' in navigator))throw Error('unsupported');
  const registration=await navigator.serviceWorker.register('sw.js');const ready=await navigator.serviceWorker.ready;const worker=ready.active||registration.active;
  if(!worker)throw Error('inactive');
  const channel=new MessageChannel();
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('timeout')),90000);channel.port1.onmessage=e=>{clearTimeout(timeout);e.data?.ok?resolve():reject(Error('cache'))};worker.postMessage({type:'CACHE_ALL'},[channel.port2])});
  status.textContent='Готово. Этот раздел доступен без сети в этом браузере. Внешние ссылки требуют интернет.';b.textContent='Обновить сохранённую версию';
 }catch{status.textContent='Не удалось сохранить всё. Проверь соединение и попробуй ещё раз.'}finally{b.disabled=false}
}
$('offlineButton').addEventListener('click',prepareOffline);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
