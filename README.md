# Defense AI V2 — voix Android renforcée

Cette version demande explicitement l'accès au microphone avant de lancer SpeechRecognition, affiche les erreurs (micro refusé, aucune parole, réseau, etc.), et indique quand la reconnaissance est terminée.

IMPORTANT : la reconnaissance vocale du navigateur fonctionne surtout dans Chrome Android avec une page HTTPS. Si l'application est ouverte sous `content://` ou comme simple fichier local, Android peut bloquer SpeechRecognition. Dans ce cas, publiez la page sur GitHub Pages/HTTPS ou utilisez une vraie application Android native.

Elle conserve aussi l'import PDF/DOCX dans « Ton mémoire ».
