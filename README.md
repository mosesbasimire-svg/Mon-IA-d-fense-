# Defense AI V2
Prototype préparé pour combiner :
1. transcription vocale ;
2. mémoire de l'étudiant ;
3. recherche Web ;
4. modèle IA ;
5. réponse synthétisée.

## Important
La V2 est une architecture frontend prête à connecter. Elle ne contient pas de clé API.
Pour une vraie recherche Web + IA, il faut un backend sécurisé (par exemple Supabase Edge Functions ou un petit serveur) qui conserve les clés secrètes.

## Étape suivante
Connecter le backend à une API IA avec recherche Web. L'API OpenAI actuelle utilise la Responses API pour les nouvelles intégrations et propose un outil Web Search. Voir la documentation officielle : https://platform.openai.com/docs/ .