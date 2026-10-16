'use strict';
const {art,locations,clues,questions,endings}=DATA;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAVE_KEY='moonbell-detective-v2';
const validClues=new Set(clues.map(c=>c.id));
function loadState(){
 let s={};try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')||{}}catch{}
 const seen=new Set(Array.isArray(s.seen)?s.seen.filter(x=>validClues.has(x)):[]);
 const visits=new Set(Array.isArray(s.visits)?s.visits.filter(i=>Number.isInteger(i)&&i>=0&&i<4):[0]);visits.add(0);
 const asked=new Set(Array.isArray(s.asked)?s.asked.filter(k=>/^[0-3]-[0-1]$/.test(k)):[]);
 let location=Number.isInteger(s.location)&&s.location>=0&&s.location<4?s.location:0;
 if(location>0&&seen.size<location*2-1&&!visits.has(location))location=0;
 return {seen,visits,asked,location,solved:s.solved===true,hints:Number.isInteger(s.hints)&&s.hints>=0?s.hints:0};
}
let state=loadState(),highlight=false,journalView='clues',talkLocation=0,activeAudioKey=null,returnFocusId='inspectButton';
let ambient=null,bell=null,soundEnabled=false,toastTimer=null,saveAvailable=true;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({...state,seen:[...state.seen],visits:[...state.visits],asked:[...state.asked]}));saveAvailable=true}catch{saveAvailable=false}updateSaveStatus()}
function updateSaveStatus(){$('saveStatus').textContent=saveAvailable?'Прогресс сохраняется в этом браузере':'Сохранение недоступно. Не закрывай вкладку до конца игры.'}
const unlocked=i=>i===0||state.seen.size>=i*2-1||state.visits.has(i);
const ready=()=>state.seen.size>=6&&state.seen.has('bell')&&state.seen.has('beam');
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500)}
function render(){
 renderRoute();renderScene();renderJournal();
 $('caseStateText').textContent=state.solved?'Дело раскрыто · можно продолжить осмотр':'Расследование открыто';
 $('caseDot').style.background=state.solved?'#a9c99e':'';
 $('heroStart').innerHTML=(state.seen.size||state.asked.size?'Продолжить расследование':'Начать расследование')+' <span aria-hidden="true">↗</span>';
 $('resumeMessage').hidden=!(state.seen.size||state.asked.size);
 $('resumeMessage').textContent=`Свиток сохранён: ${state.seen.size} из 8 улик · ${locations[state.location].name}`;
 updateSaveStatus();
}
function renderRoute(){
 const kanji=['社','路','茶','橋'];
 $('route').innerHTML=locations.map((l,i)=>{const count=l.hotspots.filter(h=>state.seen.has(h.id)).length;const open=unlocked(i);return `<button type="button" class="route-button ${state.location===i?'active':''} ${open?'':'locked'}" data-location="${i}" aria-pressed="${state.location===i}" ${open?'':'disabled'}><span lang="ja" aria-hidden="true">${kanji[i]}</span><span><strong>${esc(l.name)}</strong><small>${open?(count===2?'✓ Осмотрено':`0${i+1} · ${count}/2 улик`):`Откроется после ${i*2-1} улик`}</small></span></button>`}).join('');
}
function renderScene(){
 const l=locations[state.location];
 $('sceneChapter').textContent=`ГЛАВА 0${state.location+1} / 04`;$('sceneTitle').textContent=l.sub;$('sceneTime').textContent=l.clock;
 $('scene').innerHTML=`<img class="scene-image" src="${art.loc[state.location]}" alt="${esc(l.sub)}: место расследования"><div class="scene-atmosphere" aria-hidden="true"></div>`+l.hotspots.map(h=>`<button type="button" class="hotspot ${state.seen.has(h.id)?'seen':''} ${highlight?'hinted':''}" style="left:${h.x}%;top:${h.y}%" data-clue="${h.id}" aria-label="Осмотреть: ${esc(clues.find(c=>c.id===h.id).title)}"><span class="point-label">${esc(clues.find(c=>c.id===h.id).title)}</span></button>`).join('');
 $('sceneDescription').textContent=l.description;
 $('inspectButton').setAttribute('aria-pressed',String(highlight));$('inspectButton').innerHTML=`<span aria-hidden="true">⌕</span> ${highlight?'Скрыть подсветку':'Подсветить детали'}`;
 $('accessibleClues').hidden=!highlight;
 $('accessibleClues').innerHTML=l.hotspots.map(h=>`<button type="button" data-clue="${h.id}">${state.seen.has(h.id)?'✓ ':''}${esc(clues.find(c=>c.id===h.id).title)}</button>`).join('');
 $('witnessName').textContent=l.narrator;$('witnessPortrait').src=portraitFor(state.location);
 const askedHere=[...state.asked].filter(k=>k.startsWith(state.location+'-')).length;
 $('witnessPrompt').textContent=askedHere?`Задано вопросов: ${askedHere} / 2 · можно перечитать ответы`:'Кажется, здесь есть о чём спросить.';
 $('localProgress').textContent=`Найдено здесь: ${l.hotspots.filter(h=>state.seen.has(h.id)).length} / 2`;
 const next=state.location+1;
 $('nextLocation').disabled=next<4&&!unlocked(next);
 $('nextLocation').innerHTML=next>=4?'К дневнику улик <span aria-hidden="true">↓</span>':unlocked(next)?'Дальше по следу <span aria-hidden="true">→</span>':'Изучи ещё одну улику';
}
function portraitFor(i){return i===0?art.people[0]:i===1?art.people[1]:i===3?art.people[2]:art.loc[2]}
function renderJournal(){
 const n=state.seen.size;
 $('clueCount').innerHTML=`${n}<span>/ 8</span>`;$('cluesBadge').textContent=n;$('testimonyBadge').textContent=state.asked.size;
 $('progressFill').style.width=(n/8*100)+'%';$('progressTrack').setAttribute('aria-valuenow',String(n));
 $('cluesTab').setAttribute('aria-pressed',String(journalView==='clues'));$('testimonyTab').setAttribute('aria-pressed',String(journalView==='testimony'));
 if(journalView==='clues')$('journalItems').innerHTML=n?clues.filter(c=>state.seen.has(c.id)).map(c=>`<button type="button" class="evidence-item" data-evidence="${c.id}"><img src="${art.clue[c.art]}" alt=""><span><strong>${esc(c.title)}</strong><small>${esc(c.type)} · ${esc(locations[c.loc].name)}</small></span></button>`).join(''):'<div class="journal-empty"><span aria-hidden="true">⌁</span>Пока ни одной находки.<br>Осмотрись у ворот — ночь оставила следы.</div>';
 else $('journalItems').innerHTML=state.asked.size?[...state.asked].sort().map(key=>{const [i,q]=key.split('-').map(Number);return `<button type="button" class="testimony-item" data-testimony="${key}"><small>${esc(locations[i].narrator)} · ${esc(locations[i].name)}</small>${esc(locations[i].questions[q][0])} ↗</button>`}).join(''):'<div class="journal-empty"><span aria-hidden="true">〰</span>Здесь будут слова свидетелей.<br>Начни разговор, чтобы услышать их версию.</div>';
 $('deductionButton').disabled=!ready();$('deductionHelp').textContent=ready()?(n===8?'Все находки собраны. Пора связать три нити истории.':'Улик достаточно для версии. Остальные находки могут открыть больше.'):'Собери шесть улик, включая обе находки у моста.';
}
function changeLocation(i){
 if(!Number.isInteger(i)||i<0||i>=4||!unlocked(i))return false;
 state.location=i;state.visits.add(i);highlight=false;save();render();
 if(soundEnabled&&i===3)ringBell(.5);
 return true;
}
function startGame(){$('investigation').scrollIntoView({behavior:'smooth'});render()}
function setVoice(key){
 stopVoice();activeAudioKey=key;$('voiceBox').hidden=!key;$('voiceControls').hidden=true;$('voiceButton').textContent='▷ Слушать историю';$('voiceStatus').textContent='';
 const player=$('voicePlayer');player.removeAttribute('src');if(key)player.src=`assets/audio/${key}.mp3`;
}
function openModal(html,key=null,focusId='inspectButton'){
 returnFocusId=focusId;setVoice(key);$('dialogContent').innerHTML=html;
 if(!$('dialog').open)$('dialog').showModal();$('dialog').scrollTop=0;
}
function closeModal(){$('dialog').close()}
function showClue(id){
 const c=clues.find(x=>x.id===id);if(!c)return;
 const first=!state.seen.has(id);state.seen.add(id);save();render();
 openModal(`<div class="dialog-layout"><div class="dialog-art"><img src="${art.clue[c.art]}" alt="${esc(c.title)} — визуальная улика"></div><div class="dialog-copy"><span class="dialog-kicker">${esc(c.type)} · УЛИКА 0${clues.indexOf(c)+1}</span><h2 id="dialogTitle">${esc(c.title)}</h2><p>${esc(c.detail)}</p><div class="observation"><strong>Запись в дневнике</strong><br>${esc(c.observation)}</div><button type="button" class="dialog-button" data-close>Продолжить осмотр →</button></div></div>`,'clue-'+id);
 if(first){toast(`В дневнике новая улика · ${state.seen.size} / 8`);if(soundEnabled&&id==='bell')ringBell(1)}
}
function showTalk(i=state.location){
 if(!unlocked(i))return;talkLocation=i;
 const l=locations[i];
 const intros=['«Пожалуйста, помогите. Колокольчик был здесь много зим…»','«Люди всегда обвиняют лисий огонь, когда не умеют читать следы», — улыбается кицунэ.','Хозяйка отодвигает чашки и понижает голос. «Я видела кое-что необычное…»','Туман складывается в детский силуэт. Голос едва слышен сквозь звон.'];
 openModal(`<div class="dialog-layout"><div class="dialog-art portrait"><img src="${portraitFor(i)}" alt="${esc(l.narrator)} — иллюстрация встречи"></div><div class="dialog-copy"><span class="dialog-kicker">РАЗГОВОР · ${esc(l.sub)}</span><h2 id="dialogTitle">${esc(l.narrator)}</h2><p>${esc(intros[i])}</p><div class="talk-questions">${l.questions.map((q,j)=>`<button type="button" data-question="${j}" aria-pressed="false">${state.asked.has(i+'-'+j)?'✓ ':''}${esc(q[0])} ↗</button>`).join('')}</div><div class="talk-answer" id="talkAnswer" role="status" hidden></div></div></div>`,null,'witnessButton');
}
function askQuestion(j){
 const l=locations[talkLocation];if(!l.questions[j])return;
 const first=!state.asked.has(talkLocation+'-'+j);state.asked.add(talkLocation+'-'+j);save();renderJournal();
 $('talkAnswer').hidden=false;$('talkAnswer').textContent=l.questions[j][1];
 document.querySelectorAll('[data-question]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.question)===j)));
 setVoice(`witness-${talkLocation}-${j}`);
 if(first)toast('Ответ сохранён в свидетельствах');
}
function showInfo(){
 openModal(`<div class="dialog-single"><span class="eyebrow">ДЕЛО № 01 · ЗАВЯЗКА</span><h2 id="dialogTitle">Ночь, когда<br>стихли фонари</h2><p>В святилище Касуми было тихо, пока в полночь не исчез старинный колокольчик, чей звон встречал путников у ворот. Хранительница Нанами уверена: кто-то снял его незадолго до начала ночного шествия.</p><p>Все подозревают лисицу-оборотня, замеченную в переулке. Но следы на пепле слишком малы, а верёвка не порвана. Выясни, что произошло, прежде чем обвинить невиновного духа.</p><div class="observation">Четыре места. Восемь улик. Три вывода.<br>Время не ограничено, ошибочную версию можно пересмотреть.</div><button type="button" class="dialog-button" data-begin>Открыть дело ↗</button></div>`,'prologue','headerStart');
}
function showDeduction(){
 if(!ready())return;
 openModal(`<form class="dialog-single" id="deductionForm"><span class="eyebrow">ЗАКЛЮЧЕНИЕ · ДЕЛО № 01</span><h2 id="dialogTitle">Свяжи три нити<br>истории</h2>${questions.map((q,i)=>`<fieldset class="deduction-group"><legend>0${i+1} · ${esc(q.name)}</legend>${q.options.map(([value,title])=>`<label><input type="radio" name="answer${i}" value="${value}" required><span>${esc(title)}</span></label>`).join('')}</fieldset>`).join('')}<div class="deduction-foot"><span>Ответь на все три вопроса.<br>Если ошибёшься, можно попробовать снова.</span><button type="submit" class="dialog-button" id="submitDeduction" disabled>Раскрыть тайну ↗</button></div></form>`,null,'deductionButton');
}
function showEnding(answers){
 if(!ready()||answers.length!==3||answers.some((a,i)=>!questions[i].options.some(o=>o[0]===a)))return;
 const score=answers.filter((a,i)=>a===['zashiki','warn','separate'][i]).length;
 const correct=score===3;const key=correct?(state.seen.size===8?'perfect':'solved'):'wrong';const end=endings[key];
 if(correct){state.solved=true;save();render()}
 const title=!correct&&score===2?'Почти разгадка':end.title;
 openModal(`<div class="ending"><img class="ending-art" src="${correct?art.people[2]:art.clue[5]}" alt="${correct?'Тихий гость в голубом кимоно':'Лунный колокольчик над мостом'}"><span class="dialog-kicker">${correct?'НОЧЬ ОТКРЫЛА СВОЮ ТАЙНУ':'НЕ ВСЕ НИТИ ЕЩЁ СВЯЗАНЫ'}</span><h2 id="dialogTitle">${esc(title)}</h2><span class="ending-score">${score} / 3 верных вывода · ${state.seen.size} / 8 улик</span><p>${esc(end.body)}</p><p class="bonus">${esc(end.bonus)}</p><div class="ending-actions"><button type="button" class="dialog-button" data-close>${correct?'Вернуться к дневнику':'Пересмотреть улики'}</button><button type="button" class="quiet" data-retry>${correct?'Попробовать другую версию':'Изменить выводы'} ↗</button></div></div>`,'ending-'+key,'deductionButton');
 if(correct&&soundEnabled)ringBell(.8);
}
function confirmReset(){openModal('<div class="dialog-single"><span class="eyebrow">НОВАЯ НОЧЬ</span><h2 id="dialogTitle">Начать дело заново?</h2><p>Улики, ответы свидетелей и заключение будут удалены из этого браузера.</p><button type="button" class="dialog-button" data-reset-confirm>Да, начать сначала</button> <button type="button" class="quiet" style="color:#7f765d;margin-left:16px" data-close>Продолжить дело</button></div>',null,'resetButton')}
function resetCase(){state={location:0,seen:new Set(),visits:new Set([0]),asked:new Set(),solved:false,hints:0};highlight=false;journalView='clues';save();closeModal();render();startGame();toast('Новый свиток открыт')}
function stopVoice(){const player=$('voicePlayer');player.pause();player.currentTime=0;setAmbientVolume()}
function setAmbientVolume(){if(ambient)ambient.volume=Number($('ambientVolume').value)/100*($('voicePlayer').paused?1:.25);if(bell)bell.volume=Number($('ambientVolume').value)/100*.6}
function ringBell(strength=1){if(!soundEnabled)return;if(!bell){bell=new Audio('assets/audio/bell.mp3');bell.preload='none'}bell.pause();bell.currentTime=0;bell.volume=Number($('ambientVolume').value)/100*strength;bell.play().catch(()=>{})}
function updateSound(){const b=$('soundButton');b.setAttribute('aria-pressed',String(soundEnabled));b.setAttribute('aria-label',soundEnabled?'Выключить звуки ночи':'Включить звуки ночи');b.innerHTML=`<span aria-hidden="true">${soundEnabled?'◉':'◌'}</span><span class="sound-label">${soundEnabled?'Ночь звучит':'Звуки ночи'}</span>`;$('soundSettings').hidden=!soundEnabled}
async function toggleSound(){
 const b=$('soundButton');if(soundEnabled){soundEnabled=false;ambient?.pause();bell?.pause();updateSound();return}
 if(!ambient){ambient=new Audio('assets/audio/rain.mp3');ambient.loop=true;ambient.preload='none'}setAmbientVolume();b.disabled=true;
 try{await ambient.play();soundEnabled=true;updateSound();ringBell(.45)}catch{toast('Звук не загрузился. Нажми ещё раз.')}finally{b.disabled=false}
}
$('heroStart').addEventListener('click',startGame);$('headerStart').addEventListener('click',startGame);$('howButton').addEventListener('click',()=>$('how').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('.info-trigger').forEach(b=>b.addEventListener('click',showInfo));
$('route').addEventListener('click',e=>{const b=e.target.closest('[data-location]');if(b&&!b.disabled)changeLocation(Number(b.dataset.location))});
for(const id of ['scene','accessibleClues'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-clue]');if(b)showClue(b.dataset.clue)});
$('inspectButton').addEventListener('click',()=>{highlight=!highlight;if(highlight){state.hints++;save()}renderScene()});
$('witnessButton').addEventListener('click',()=>showTalk());
$('nextLocation').addEventListener('click',()=>{if(state.location===3){$('notebook').scrollIntoView({behavior:'smooth'});return}if(changeLocation(state.location+1))$('route').scrollIntoView({behavior:'smooth'})});
$('cluesTab').addEventListener('click',()=>{journalView='clues';renderJournal()});$('testimonyTab').addEventListener('click',()=>{journalView='testimony';renderJournal()});
$('journalItems').addEventListener('click',e=>{const c=e.target.closest('[data-evidence]');if(c){showClue(c.dataset.evidence);return}const t=e.target.closest('[data-testimony]');if(t){const [i,j]=t.dataset.testimony.split('-').map(Number);showTalk(i);askQuestion(j)}});
$('deductionButton').addEventListener('click',showDeduction);$('resetButton').addEventListener('click',confirmReset);
$('dialogClose').addEventListener('click',closeModal);
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){closeModal();return}if(e.target.closest('[data-close]'))closeModal();else if(e.target.closest('[data-question]'))askQuestion(Number(e.target.closest('[data-question]').dataset.question));else if(e.target.closest('[data-begin]')){closeModal();startGame()}else if(e.target.closest('[data-retry]'))showDeduction();else if(e.target.closest('[data-reset-confirm]'))resetCase()});
$('dialog').addEventListener('change',()=>{const submit=$('submitDeduction');if(submit)submit.disabled=questions.some((_,i)=>!document.querySelector(`input[name="answer${i}"]:checked`))});
$('dialog').addEventListener('submit',e=>{if(e.target.id!=='deductionForm')return;e.preventDefault();const answers=questions.map((_,i)=>document.querySelector(`input[name="answer${i}"]:checked`)?.value);if(answers.every(Boolean))showEnding(answers)});
$('dialog').addEventListener('close',()=>{stopVoice();$(returnFocusId)?.focus({preventScroll:true})});
$('voiceButton').addEventListener('click',async()=>{if(!activeAudioKey)return;const p=$('voicePlayer');$('voiceControls').hidden=false;if(!p.paused){p.pause();return}const key=activeAudioKey;try{await p.play();if(activeAudioKey!==key||!$('dialog').open)p.pause()}catch{$('voiceStatus').textContent='Не удалось включить запись. Попробуй кнопку воспроизведения ниже.'}});
for(const event of ['play','pause','ended'])$('voicePlayer').addEventListener(event,()=>{$('voiceButton').textContent=$('voicePlayer').paused?'▷ Слушать историю':'Ⅱ Пауза';setAmbientVolume()});
$('voicePlayer').addEventListener('error',()=>{if(activeAudioKey)$('voiceStatus').textContent='Запись не загрузилась. Проверь соединение и попробуй снова.'});
$('soundButton').addEventListener('click',toggleSound);$('ambientVolume').addEventListener('input',setAmbientVolume);
document.addEventListener('visibilitychange',()=>{if(document.hidden){ambient?.pause();bell?.pause()}else if(soundEnabled)ambient?.play().catch(()=>{soundEnabled=false;updateSound()})});
window.addEventListener('pagehide',()=>{stopVoice();ambient?.pause();bell?.pause()});
render();
