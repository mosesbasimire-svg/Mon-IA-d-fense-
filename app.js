const SUPABASE_URL = "https://qhlrbzqlivkaiydfkkqg.supabase.co";
const SUPABASE_KEY = "sb_publishable_k-TqofekxbnTFFmajug_lQ_bitz7C_9";

const $ = id => document.getElementById(id);

let rec = null;
let listening = false;
let finalText = "";
let audioContext = null;
let analyser = null;
let source = null;
let stream = null;
let raf = null;

const Speech =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (Speech) {
  rec = new Speech();

  rec.lang = "fr-FR";
  rec.continuous = true;
  rec.interimResults = true;

  rec.onstart = () => {
    listening = true;
    $("state").textContent = "🎙️ Écoute...";
    $("start").disabled = true;
    $("stop").disabled = false;
  };

  rec.onresult = event => {
    let interim = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const text = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalText += text + " ";
      } else {
        interim += text;
      }
    }

    $("q").value = (finalText + interim).trim();
  };

  rec.onerror = event => {
    $("state").textContent =
      "Erreur microphone : " + event.error;
  };

  rec.onend = () => {
    if (listening) {
      try {
        rec.start();
      } catch (e) {}
    }
  };
} else {
  $("state").textContent =
    "❌ Reconnaissance vocale non compatible";
}


// 🎙️ Activation du microphone
async function startMicrophone() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    audioContext =
      new (window.AudioContext ||
        window.webkitAudioContext)();

    analyser = audioContext.createAnalyser();

    source =
      audioContext.createMediaStreamSource(stream);

    source.connect(analyser);

    const data =
      new Uint8Array(analyser.frequencyBinCount);

    function updateLevel() {
      if (!analyser) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;

      for (const value of data) {
        const v = (value - 128) / 128;
        sum += v * v;
      }

      const level =
        Math.min(
          100,
          Math.sqrt(sum / data.length) * 300
        );

      $("level").style.width = level + "%";

      raf = requestAnimationFrame(updateLevel);
    }

    updateLevel();

  } catch (error) {
    $("state").textContent =
      "❌ Microphone refusé ou indisponible";

    console.error(error);
  }
}


// ☁️ Enregistrer la question dans Supabase
async function saveQuestion(question) {

  try {

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/defense_questions",
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          question: question
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return true;

  } catch (error) {

    console.error(
      "Erreur Supabase :",
      error
    );

    return false;
  }
}


// ▶️ Démarrer
$("start").onclick = async () => {

  finalText = "";
  $("q").value = "";

  await startMicrophone();

  if (rec) {
    try {
      rec.start();
    } catch (error) {
      console.error(error);
    }
  }
};


// ⏹️ Arrêter
$("stop").onclick = async () => {

  listening = false;

  if (rec) {
    try {
      rec.stop();
    } catch (e) {}
  }

  const question = $("q").value.trim();

  if (question) {

    $("state").textContent =
      "☁️ Enregistrement de la question...";

    const saved = await saveQuestion(question);

    if (saved) {
      $("state").textContent =
        "✅ Question enregistrée dans Supabase";
    } else {
      $("state").textContent =
        "⚠️ Question reconnue mais non enregistrée";
    }
  } else {
    $("state").textContent = "Prêt";
  }

  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  source = null;

  $("level").style.width = "0%";
  $("start").disabled = false;
  $("stop").disabled = true;
};


// 🧹 Effacer
$("clear").onclick = () => {

  $("q").value = "";
  $("answer").textContent =
    "La réponse apparaîtra ici.";

  $("sources").textContent =
    "Aucune recherche effectuée.";

  $("state").textContent = "Prêt";
};


// 🤖 Analyse
$("ask").onclick = async () => {

  const question = $("q").value.trim();
  const memo = $("memo").value.trim();
  const web = $("web").checked;

  if (!question) {
    $("answer").textContent =
      "Écris ou dicte une question.";
    return;
  }

  $("state").textContent =
    "🔎 Question enregistrée. Analyse prête.";

  $("sources").innerHTML =
    web
      ? "🌐 Recherche Web activée — connexion IA à ajouter."
      : "🌐 Recherche Web désactivée.";

  $("answer").textContent =
    "Question : " +
    question +
    "\n\n" +
    "Prototype connecté à Supabase.\n\n" +
    (memo
      ? "Le mémoire fourni sera utilisé pour la prochaine étape."
      : "Ajoute ton mémoire pour préparer l'analyse.");
};
