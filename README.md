# Defense AI V2 — version améliorée

Cette version ajoute :

- 🎙️ une reconnaissance vocale améliorée avec messages d'erreur clairs ;
- 📄 import direct de fichiers PDF ;
- 📝 import direct de fichiers DOCX ;
- 📚 extraction du texte du document vers « Ton mémoire » ;
- 🗑️ bouton pour vider le mémoire ;
- compatibilité mobile avec une interface adaptée.

## Important pour les PDF

Les PDF contenant du vrai texte sont importés directement.
Un PDF qui est uniquement constitué de photos/scans nécessitera ensuite un module OCR pour reconnaître le texte.

## Important pour la voix

Sur Android, utilisez de préférence Google Chrome et autorisez le microphone.
La reconnaissance vocale du navigateur peut nécessiter Internet.

## IA et recherche Web

Comme dans la V2 originale, aucune clé API secrète n'est placée dans le navigateur.
La prochaine étape peut connecter un backend sécurisé (par exemple Supabase Edge Functions) à une API IA et à une recherche Web.
