# TAWI - transcribe and Translate

A real-time speech transcription and translation app that runs entirely in the browser. Built with [Transformers.js](https://huggingface.co/docs/transformers.js) for ML models and [Supabase Realtime](https://supabase.com/realtime) for live broadcasting.

## How It Works

1. **Speech Recognition**

    - Uses OpenAI's Whisper model (via [`transcriptionWorker.js`](src/transcriptionWorker.js))
    - Captures audio from browser microphone
    - Processes speech in real-time using WebGPU acceleration
    - Supports multiple input languages

2. **Broadcasting**

    - Creates a unique channel ID for each session
    - Broadcasts transcribed text via Supabase Realtime
    - Listeners can join using channel ID URL
    - Implemented in [`broadcaster.jsx`](src/routes/broadcaster.jsx)

3. **Translation**

    - Uses Meta's NLLB-200 model for translation
    - Supports 200+ languages
    - Runs entirely in browser using WebWorkers
    - Translation logic in [`translationWorker.js`](src/translationWorker.js)

4. **Receiving**

- Listeners receive transcribed text in real-time
- Can select target language for translation
- Translations update live as speech is received
- Handled by [`receiver.jsx`](src/routes/receiver.jsx)

## Requirements

- Modern browser with WebGPU support
- Supabase account for realtime features
- Microphone access for broadcasting

## Setup

1. Clone the repository

2. Copy environment file:

    ```sh
    cp .env.local.example .env.local
    ```

3. Configure Supabase:

   - Create a Supabase project
   - Add URL and anon key to `.env.local`

4. Install dependencies and run:

    ```sh
    npm install
    npm run dev
    ```

## Deployment

The app can be deployed to GitHub Pages:

1. Add these secrets to your repository:
   - `VITE_DOMAIN`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Push to main branch to trigger deployment

## Architecture

- React + Vite for frontend
- Web Workers for ML processing
- WebGPU for hardware acceleration
- Supabase Realtime for broadcasting
- TailwindCSS for styling
