const $=id=>document.getElementById(id);
let recognition=null, listening=false, finalText='', stream=null, audioCtx=null, analyser=null, raf=null;
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;

function state(t){$('state').textContent=t;}
function help(t){$('voiceHelp').textContent=t;}

function stopMeter(){
  if(raf) cancelAnimationFrame(raf); raf=null;
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null;}
  analyser=null; $('level').style.width='0%';
}
function meter(){
  if(!stream || !audioCtx)return;
  analyser=audioCtx.createAnalyser(); analyser.fftSize=256;
  const src=audioCtx.createMediaStreamSource(stream); src.connect(analyser);
  const data=new Uint8Array(analyser.frequencyBinCount);
  const loop=()=>{
    if(!analyser)return;
    analyser.getByteTimeDomainData(data); let s=0;
    for(const x of data){const v=(x-128)/128;s+=v*v;}
    $('level').style.width=Math.min(100,Math.sqrt(s/data.length)*350)+'%';
    raf=requestAnimationFrame(loop);
  }; loop();
}

async function microphonePermission(){
  if(!navigator.mediaDevices?.getUserMedia) return true;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') await audioCtx.resume();
    meter();
    return true;
  }catch(e){
    state('⚠️ Microphone refusé');
    help('Autorisez le microphone dans Chrome : Paramètres du site → Microphone → Autoriser, puis rechargez la page.');
    return false;
  }
}

if(SpeechRecognition){
  recognition=new SpeechRecognition();
  recognition.lang='fr-FR';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=3;

  recognition.onstart=()=>{
    listening=true; state('🎙️ Écoute...');
    $('start').disabled=true; $('stop').disabled=false;
    help('Parlez maintenant. Votre voix sera transformée en texte.');
  };
  recognition.onresult=e=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal) finalText += t+' '; else interim += t;
    }
    $('q').value=(finalText+interim).trim();
  };
  recognition.onerror=e=>{
    listening=false; $('start').disabled=false; $('stop').disabled=true; stopMeter();
    const m={
      'not-allowed':'Microphone non autorisé. Autorisez le microphone puis réessayez.',
      'service-not-allowed':'La reconnaissance vocale est bloquée par le navigateur.',
      'no-speech':'Aucune parole détectée. Appuyez sur Écouter et parlez immédiatement.',
      'audio-capture':'Aucun microphone disponible.',
      'network':'Le service vocal a besoin d’Internet.'
    };
    state('⚠️ '+e.error); help(m[e.error]||('Erreur vocale : '+e.error));
  };
  recognition.onend=()=>{
    listening=false; $('start').disabled=false; $('stop').disabled=true; stopMeter();
    if($('q').value.trim()){state('✅ Texte détecté');help('Transcription terminée. Vous pouvez modifier la question ou appuyer sur Analyser avec IA.');}
    else state('Prêt');
  };
}else{
  state('⚠️ Voix indisponible');
  help('Ce navigateur ne fournit pas SpeechRecognition. Utilisez Google Chrome sur Android et ouvrez cette application depuis une adresse HTTPS (GitHub Pages), pas depuis content:// ou un fichier local.');
}

$('start').onclick=async()=>{
  if(!recognition){
    help('Solution : ouvrez l’application dans Google Chrome sur Android depuis HTTPS. Si elle est ouverte comme content://, la reconnaissance vocale peut être bloquée.');
    return;
  }
  if(listening)return;
  finalText=''; $('q').value='';
  const ok=await microphonePermission(); if(!ok)return;
  try{ recognition.start(); }
  catch(e){ stopMeter(); help('La reconnaissance ne peut pas démarrer. Rechargez la page puis réessayez.'); }
};
$('stop').onclick=()=>{try{recognition?.stop()}catch(e){} listening=false; stopMeter(); $('start').disabled=false; $('stop').disabled=true; state('Prêt');};
$('clear').onclick=()=>{$('q').value='';finalText='';$('answer').textContent='La réponse apparaîtra ici.';$('sources').textContent='Aucune recherche effectuée.';state('Prêt');};

// Import PDF / DOCX
$('importBtn').onclick=()=>$('docFile').click();
$('docFile').onchange=async()=>{
 const f=$('docFile').files[0]; if(!f)return;
 $('fileName').textContent=f.name; $('importStatus').textContent='⏳ Lecture...';
 try{
  let text='';
  if(f.name.toLowerCase().endsWith('.pdf')){
   if(!window.pdfjsLib)throw Error('Lecteur PDF indisponible. Connectez-vous à Internet.');
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
   const pages=[]; for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();pages.push(c.items.map(x=>x.str).join(' '));}
   text=pages.join('\n\n');
  }else if(f.name.toLowerCase().endsWith('.docx')){
   if(!window.mammoth)throw Error('Lecteur DOCX indisponible. Connectez-vous à Internet.');
   text=(await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()})).value;
  }else throw Error('Choisissez un fichier PDF ou DOCX.');
  if(!text.trim())throw Error('Aucun texte trouvé. Un PDF scanné nécessitera un OCR.');
  $('memo').value=text.trim(); $('importStatus').textContent='✅ Document importé.';
 }catch(e){$('importStatus').textContent='❌ '+e.message;}
 $('docFile').value='';
};
$('clearMemo').onclick=()=>{$('memo').value='';$('fileName').textContent='';$('importStatus').textContent='Mémoire vidé.';};

$('ask').onclick=()=>{
 const q=$('q').value.trim(),m=$('memo').value.trim();
 if(!q){$('answer').textContent='Écris ou dicte une question.';return;}
 const kws=q.toLowerCase().split(/\W+/).filter(x=>x.length>4);
 const matches=m?kws.filter(x=>m.toLowerCase().includes(x)):[];
 $('sources').textContent=$('web').checked?'🌐 Recherche Web prête à être connectée à une API.':'🌐 Recherche Web désactivée.';
 $('answer').textContent='Question : '+q+'\n\nProposition de réponse V2 :\n'+(m?'Éléments du mémoire correspondant : '+(matches.join(', ')||'aucun mot-clé direct')+'.\n\nLa connexion à une IA pourra ensuite produire la réponse complète.':'Aucun mémoire fourni. Une IA connectée pourra rechercher et répondre.')+'\n\n⚠️ Prototype : aucune clé API secrète dans le navigateur.';
};
