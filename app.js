const $=id=>document.getElementById(id);

let rec=null, listening=false, finalText='', ctx=null, an=null, src=null, raf=null;
const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;

function setState(t){ $('state').textContent=t; }

if(Speech){
  rec=new Speech();
  rec.lang='fr-FR';
  rec.continuous=false;
  rec.interimResults=true;
  rec.maxAlternatives=1;

  rec.onstart=()=>{
    listening=true;
    setState('🎙️ Écoute...');
    $('start').disabled=true;
    $('stop').disabled=false;
    $('voiceHelp').textContent='Parlez clairement. Le texte apparaîtra ici dès que le téléphone reconnaît votre voix.';
  };

  rec.onresult=e=>{
    let inter='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const text=e.results[i][0].transcript;
      if(e.results[i].isFinal) finalText += text+' ';
      else inter += text;
    }
    $('q').value=(finalText+inter).trim();
  };

  rec.onerror=e=>{
    listening=false;
    $('start').disabled=false;
    $('stop').disabled=true;
    setState('⚠️ Problème vocal');
    const messages={
      'not-allowed':'Microphone refusé. Autorisez le microphone pour cette page.',
      'service-not-allowed':'Le service de reconnaissance vocale est bloqué.',
      'no-speech':'Aucune parole détectée. Appuyez de nouveau sur Écouter et parlez.',
      'audio-capture':'Le microphone n’est pas disponible.',
      'network':'La reconnaissance vocale nécessite une connexion Internet.'
    };
    $('voiceHelp').textContent=messages[e.error]||('Erreur de reconnaissance : '+e.error);
    stopMeter();
  };

  rec.onend=()=>{
    listening=false;
    $('start').disabled=false;
    $('stop').disabled=true;
    setState('Prêt');
    stopMeter();
  };
}else{
  setState('⚠️ Voix non compatible');
  $('voiceHelp').textContent='La reconnaissance vocale n’est pas disponible dans ce navigateur. Ouvrez l’application dans Google Chrome et autorisez le microphone.';
}

async function meter(){
  if(!navigator.mediaDevices?.getUserMedia)return;
  try{
    const st=await navigator.mediaDevices.getUserMedia({audio:true});
    ctx=new(window.AudioContext||window.webkitAudioContext)();
    an=ctx.createAnalyser();
    src=ctx.createMediaStreamSource(st);
    an.fftSize=256;
    src.connect(an);
    const d=new Uint8Array(an.frequencyBinCount);
    function loop(){
      if(!an)return;
      an.getByteTimeDomainData(d);
      let s=0;
      for(const x of d){const v=(x-128)/128;s+=v*v}
      $('level').style.width=Math.min(100,Math.sqrt(s/d.length)*300)+'%';
      raf=requestAnimationFrame(loop);
    }
    loop();
  }catch(e){}
}

function stopMeter(){
  if(raf)cancelAnimationFrame(raf);
  raf=null;
  if(src?.mediaStream)src.mediaStream.getTracks().forEach(t=>t.stop());
  if(ctx)ctx.close().catch(()=>{});
  ctx=null;an=null;src=null;
  $('level').style.width='0%';
}

function stop(){
  listening=false;
  if(rec)try{rec.stop()}catch(e){}
  $('start').disabled=false;
  $('stop').disabled=true;
  setState('Prêt');
  stopMeter();
}

$('start').onclick=async()=>{
  finalText='';
  $('q').value='';
  if(!rec){
    $('voiceHelp').textContent='Reconnaissance vocale indisponible. Essayez Google Chrome sur Android.';
    return;
  }
  try{
    await meter();
    rec.start();
  }catch(e){
    $('voiceHelp').textContent='Impossible de démarrer. Vérifiez l’autorisation du microphone puis réessayez.';
  }
};

$('stop').onclick=stop;

$('clear').onclick=()=>{
  $('q').value='';
  $('answer').textContent='La réponse apparaîtra ici.';
  $('sources').textContent='Aucune recherche effectuée.';
};

$('clearMemo').onclick=()=>{
  $('memo').value='';
  $('fileName').textContent='';
  $('importStatus').textContent='Mémoire vidée.';
};

$('importBtn').onclick=()=>$('docFile').click();

$('docFile').addEventListener('change',async()=>{
  const file=$('docFile').files[0];
  if(!file)return;

  $('fileName').textContent=file.name;
  $('importStatus').textContent='⏳ Lecture du document...';

  try{
    let text='';

    if(file.name.toLowerCase().endsWith('.pdf')){
      if(!window.pdfjsLib)throw new Error('Le lecteur PDF n’est pas chargé. Vérifiez la connexion Internet.');
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const buffer=await file.arrayBuffer();
      const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);
        const content=await page.getTextContent();
        pages.push(content.items.map(x=>x.str).join(' '));
      }
      text=pages.join('\\n\\n');
    }else if(file.name.toLowerCase().endsWith('.docx')){
      if(!window.mammoth)throw new Error('Le lecteur DOCX n’est pas chargé. Vérifiez la connexion Internet.');
      const buffer=await file.arrayBuffer();
      const result=await mammoth.extractRawText({arrayBuffer:buffer});
      text=result.value;
    }else{
      throw new Error('Format non pris en charge. Choisissez un PDF ou un DOCX.');
    }

    if(!text.trim())throw new Error('Aucun texte exploitable n’a été trouvé. Si votre PDF est une photo/scanner, il faudra ajouter un module OCR.');

    $('memo').value=text.trim();
    $('importStatus').textContent='✅ Document importé avec succès. Vous pouvez maintenant poser une question.';
  }catch(err){
    $('importStatus').textContent='❌ '+(err.message||'Impossible de lire le document.');
  }

  $('docFile').value='';
});

$('ask').onclick=()=>{
  let q=$('q').value.trim(),m=$('memo').value.trim(),web=$('web').checked;
  if(!q){$('answer').textContent='Écris ou dicte une question.';return}
  let kws=q.toLowerCase().split(/\W+/).filter(x=>x.length>4);
  let matches=m?kws.filter(x=>m.toLowerCase().includes(x)):[];

  $('sources').innerHTML=web
    ?'🌐 Recherche Web : prête à être connectée à l’API de recherche.'
    :'🌐 Recherche Web désactivée.';

  $('answer').textContent='Question : '+q+'\\n\\nProposition de réponse V2 :\\n'
    +(m
      ?'Ton mémoire contient des éléments correspondant à : '+(matches.join(', ')||'aucun mot-clé direct')+'.\\n\\nUne IA connectée pourra ensuite combiner ces éléments avec les résultats Web pour produire une réponse fiable et concise.'
      :'Aucun contexte de mémoire fourni. Une IA connectée pourra rechercher sur le Web et construire une réponse.')
    +'\\n\\n⚠️ Prototype : aucune clé API n’est stockée dans cette page.';
};
