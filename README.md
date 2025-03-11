# Babelfish.ai

A realtime, live transcription and translation app that works locally using a browser. Built with [Huggingface Transformer.js](https://huggingface.co/docs/transformers.js) and [Supabase Realtime](https://supabase.com/realtime).

## Features

🎙️ Realtime in-browser speech-to-text with OpenAI Whisper [[transcriptionWorker.js](./src/transcriptionWorker.js)]

📡 Broadcast to subscribed clients with Supabase Realtime. [[broadcaster.jsx](./src/routes/broadcaster.jsx)] [[receiver.jsx](./src/routes/receiver.jsx)]

🌏 Translate to 200 languages with Meta's NLLB-200 [[translationWorker.js](./src/translationWorker.js)]

## Run locally

- `cp .env.local.example .env.local`.
- Set your Supabase credentials in `.env.local`.
- Run `npm run dev`

## Deploy to GitHub Pages

- Set your secrets in the GitHub repository settings.
- Push to main to deploy.
