# TAWI - Transcribe and Translate

A real-time speech transcription and translation app that runs entirely in the browser. Built with [Transformers.js](https://huggingface.co/docs/transformers.js) for ML models and [Supabase Realtime](https://supabase.com/realtime) for live broadcasting.

## Features

- 🎤 Real-time speech transcription using Whisper
- 🌍 Support for 200+ languages for translation
- 🚀 Runs completely in the browser - no server needed
- ⚡ Hardware-accelerated using WebGPU
- 🔄 Live broadcasting and real-time translation
- 📱 Responsive design for desktop and mobile
- 🧠 Efficient ML model caching for faster loads
- 🔒 Secure and private - all processing done locally

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

- Modern browser with WebGPU support (Chrome Canary recommended)
- Supabase account for realtime features
- Microphone access for broadcasting
- Minimum 4GB RAM recommended
- GPU with WebGPU support for optimal performance

## Browser Support

- ✅ Chrome Canary (Recommended)
- ✅ Chrome Beta with WebGPU flag enabled
- ✅ Edge Canary with WebGPU flag enabled
- ❌ Firefox (WebGPU support coming soon)
- ❌ Safari (WebGPU support coming soon)

## Setup

1. Clone the repository

2. Copy environment file:

    ```sh
    cp .env.local.example .env.local
    ```

3. Configure Supabase:

   - Create a Supabase project
   - Add URL and anon key to `.env.local`
   - Enable Realtime features in your Supabase project

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

2. Enable GitHub Pages in your repository settings:
   - Go to repository Settings → Pages
   - Set source to "GitHub Actions"

3. Push to main branch to trigger deployment

## Architecture

- React + Vite for frontend
- Web Workers for ML processing
- WebGPU for hardware acceleration
- Supabase Realtime for broadcasting
- TailwindCSS for styling

## Models

- **Whisper**: ~200MB, automatically cached after first load
- **NLLB-200**: ~300MB, automatically cached after first load

## Troubleshooting

### Common Issues

1. **WebGPU Not Available**
   - Make sure you're using a supported browser
   - Enable WebGPU flags in Chrome/Edge settings

2. **Microphone Access**
   - Grant microphone permissions in browser
   - Check system microphone settings

3. **Performance Issues**
   - Close other resource-intensive tabs
   - Ensure adequate GPU memory is available
   - Check for browser console errors

4. **Broadcasting Issues**
   - Verify Supabase configuration
   - Check network connectivity
   - Ensure Realtime feature is enabled in Supabase

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Whisper model
- Meta for the NLLB-200 model
- Hugging Face for Transformers.js
- Supabase for Realtime functionality
