const $ = id => document.getElementById(id);

let rec = null;
let listening = false;
let finalText = "";
let ctx = null;
let an = null;
let src = null;
let raf = null;

const FUNCTION_URL =
  "https://qhlrbzqlivkaiydfkkqg.supabase.co/functions/v1/clever-function";

/* =========================
   RECONNAISSANCE VOCALE
========================= */

const Speech =
  window.SpeechRecognition || window.webkitSpeechRecognition;

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

  rec.onresult = e => {
    let interim = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalText += e.results[i][0].transcript + " ";
      } else {
        interim += e.results[i][0].transcript;
      }
    }

    $("q").value = (finalText + interim).trim();
  };

  rec.onerror = e => {
    stop();
    $("state").textContent = "Erreur : " + e.error;
  };

  rec.onend = () => {
    if (listening) {
      try {
        rec.start();
      } catch (e) {}
    }
  };
} else {
  $("state").textContent = "Voix non compatible avec ce navigateur.";
}

/* =========================
   NIVEAU DU MICRO
========================= */

async function meter() {
  if (!navigator.mediaDevices?.getUserMedia) return;

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    an = ctx.createAnalyser();
    src = ctx.createMediaStreamSource(stream);

    src.connect(an);

    const data = new Uint8Array(an.frequencyBinCount);

    function loop() {
      if (!an) return;

      an.getByteTimeDomainData(data);

      let sum = 0;

      for (const x of data) {
        const v = (x - 128) / 128;
        sum += v * v;
      }

      $("level").style.width =
        Math.min(100, Math.sqrt(sum / data.length) * 300) + "%";

      raf = requestAnimationFrame(loop);
    }

    loop();

  } catch (e) {}
}

/* =========================
   ARRÊTER LE MICRO
========================= */

function stop() {
  listening = false;

  if (rec) {
    try {
      rec.stop();
    } catch (e) {}
  }

  $("start").disabled = false;
  $("stop").disabled = true;
  $("state").textContent = "Prêt";

  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }

  if (src?.mediaStream) {
    src.mediaStream.getTracks().forEach(track => track.stop());
  }

  if (ctx) {
    ctx.close().catch(() => {});
  }

  ctx = null;
  an = null;

  $("level").style.width = "0%";
}

/* =========================
   BOUTON DÉMARRER
========================= */

$("start").onclick = () => {
  finalText = "";
  $("q").value = "";

  try {
    rec?.start();
    meter();
  } catch (e) {}
};

/* =========================
   BOUTON ARRÊTER
========================= */

$("stop").onclick = stop;

/* =========================
   BOUTON EFFACER
========================= */

$("clear").onclick = () => {
  $("q").value = "";
  $("answer").textContent =
    "La réponse apparaîtra ici.";
  $("sources").textContent =
    "Aucune recherche effectuée.";
};

/* =========================
   ANALYSER AVEC SUPABASE
========================= */

$("ask").onclick = async () => {

  const question = $("q").value.trim();
  const memo = $("memo").value.trim();

  if (!question) {
    $("answer").textContent =
      "Écris ou dicte une question.";
    return;
  }

  $("answer").textContent =
    "⏳ Analyse en cours...";

  $("sources").textContent =
    "🔄 Connexion au moteur d'analyse...";

  try {

    const response = await fetch(FUNCTION_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: question,
        memo: memo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Erreur du serveur."
      );
    }

    $("answer").textContent =
      data.answer || "Aucune réponse reçue.";

    $("sources").textContent =
      "✅ Réponse reçue depuis Supabase.";

  } catch (error) {

    $("answer").textContent =
      "❌ Erreur : " + error.message;

    $("sources").textContent =
      "Impossible de contacter le moteur d'analyse.";
  }
