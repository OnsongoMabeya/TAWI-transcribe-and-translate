import { useEffect, useState, useRef } from 'react';

import { AudioVisualizer } from '../components/AudioVisualizer';
import Progress from '../components/Progress';
import { LanguageSelector } from '../components/LanguageSelectorBroadcaster';
import GitHubLink from '../components/GitHubLink';
import broadcast from '../utils/broadcaster';
import { randomId } from '../utils/utils';

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;

const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

function App({ supabase }) {
  // Create a reference to the worker object.
  const worker = useRef(null);

  const recorderRef = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [text, setText] = useState('');
  const [tps, setTps] = useState(null);
  const [language, setLanguage] = useState('en');
  const languageRef = useRef(language);

  // Processing
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [stream, setStream] = useState(null);
  const audioContextRef = useRef(null);

  // Broadcast
  const channelId = useRef(randomId());
  const channel = supabase.channel(channelId.current);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(
        new URL('../transcriptionWorker.js', import.meta.url),
        {
          type: 'module',
        }
      );

      // Send initial load message to worker
      worker.current.postMessage({ type: 'load' });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'loading':
          // Model file start load: add a new progress item to the list.
          setStatus('loading');
          setLoadingMessage(e.data.data);
          break;

        case 'initiate':
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setStatus('ready');
          recorderRef.current?.start();
          break;

        case 'start':
          {
            // Start generation
            setIsProcessing(true);

            // Request new data from the recorder
            recorderRef.current?.requestData();
          }
          break;

        case 'update':
          {
            // Generation update: update the output text.
            const { tps } = e.data;
            setTps(tps);
          }
          break;

        case 'complete':
          // Generation complete: re-enable the "Generate" button
          setIsProcessing(false);
          setText(e.data.output);
          broadcast({
            channel,
            message: e.data.output[0],
            language: languageRef.current,
          });
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener('message', onMessageReceived);
    };
  }, []);

  useEffect(() => {
    if (recorderRef.current) return; // Already set

    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setStream(stream);

          recorderRef.current = new MediaRecorder(stream);
          audioContextRef.current = new AudioContext({
            sampleRate: WHISPER_SAMPLING_RATE,
          });

          recorderRef.current.onstart = () => {
            setRecording(true);
            setChunks([]);
          };
          recorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
              setChunks((prev) => [...prev, e.data]);
            } else {
              // Empty chunk received, so we request new data after a short timeout
              setTimeout(() => {
                recorderRef.current.requestData();
              }, 25);
            }
          };

          recorderRef.current.onstop = () => {
            setRecording(false);
          };
        })
        .catch((err) => console.error('The following error occurred: ', err));
    } else {
      console.error('getUserMedia not supported on your browser!');
    }

    return () => {
      recorderRef.current?.stop();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recorderRef.current) return;
    if (!recording) return;
    if (isProcessing) return;
    if (status !== 'ready') return;

    if (chunks.length > 0) {
      // Generate from data
      const blob = new Blob(chunks, { type: recorderRef.current.mimeType });

      const fileReader = new FileReader();

      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result;
        const decoded = await audioContextRef.current.decodeAudioData(
          arrayBuffer
        );
        let audio = decoded.getChannelData(0);
        if (audio.length > MAX_SAMPLES) {
          // Get last MAX_SAMPLES
          audio = audio.slice(-MAX_SAMPLES);
        }

        worker.current.postMessage({
          type: 'generate',
          data: { audio, language },
        });
      };
      fileReader.readAsArrayBuffer(blob);
    } else {
      recorderRef.current?.requestData();
    }
  }, [status, recording, isProcessing, chunks, language]);

  return IS_WEBGPU_AVAILABLE ? (
    <div className="min-h-screen bg-gradient-to-br from-primary-400 via-accent-light to-primary-600 animate-gradient">
      <div className="h-full min-h-screen overflow-auto scrollbar-thin flex justify-center items-center flex-col relative p-6">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-md" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-300/30 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl">
          <GitHubLink url="https://github.com/OnsongoMabeya/TAWI-transcribe-and-translate" />
          
          <div className="flex flex-col items-center mb-12">
            <div className="text-center space-y-6">
              <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-900 to-accent-dark">
                TAWI - Broadcaster
              </h1>
              <div className="max-w-2xl mx-auto">
                <p className="text-2xl font-medium text-primary-800 leading-relaxed">
                  Real-time in-browser speech recognition & decentralized AI translation
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-8 w-full max-w-3xl mx-auto">
            {status === null && (
              <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-8 shadow-xl border border-white/50 transform transition-all hover:scale-[1.02]">
                <div className="prose prose-lg">
                  <h2 className="text-2xl font-semibold text-primary-900 mb-6">
                    Welcome to TAWI
                  </h2>
                  <p className="text-lg text-primary-800 leading-relaxed mb-6">
                    You're about to experience real-time speech recognition powered by{' '}
                    <a
                      href="https://huggingface.co/onnx-community/whisper-base"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent-dark hover:text-accent transition-colors underline"
                    >
                      whisper-base
                    </a>
                    , a powerful 73 million parameter model optimized for web inference.
                  </p>
                  <p className="text-lg text-primary-800 leading-relaxed">
                    Using{' '}
                    <a
                      href="https://huggingface.co/docs/transformers.js"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent-dark hover:text-accent transition-colors underline"
                    >
                      🤗&nbsp;Transformers.js
                    </a>
                    {' '}and ONNX Runtime Web, everything runs directly in your browser. The model (~200&nbsp;MB) will be cached for future use.
                  </p>
                </div>

                <button
                  className="mt-8 w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-accent hover:from-primary-600 hover:to-accent-dark text-white text-lg font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    worker.current.postMessage({ type: 'load' });
                    setStatus('loading');
                  }}
                  disabled={status !== null}
                >
                  Start Transcribing
                </button>
              </div>
            )}

            {status === 'ready' && (
              <div className="w-full space-y-6">
                <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-primary-900">Share Your Channel</h2>
                    <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-xl">
                      <div className="flex-1">
                        <p className="text-primary-900 font-medium mb-2">Channel ID:</p>
                        <pre className="inline-block bg-primary-100/50 py-2 px-4 rounded-lg text-primary-700 font-medium w-full overflow-x-auto">
                          {channelId.current}
                        </pre>
                      </div>
                      <a
                        href={`${import.meta.env.BASE_URL}#/receiver/${channelId.current}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] hover:from-primary-600 hover:to-accent-dark"
                      >
                        Open Receiver
                      </a>
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-primary-900 mb-4">Live Transcription</h2>
                    <AudioVisualizer className="w-full rounded-xl mb-6" stream={stream} />
                    <div className="relative">
                      <div className="w-full min-h-[120px] overflow-y-auto overflow-wrap-anywhere rounded-xl bg-white/50 p-4 font-medium text-primary-900">
                        {text || 'Waiting for speech...'}
                      </div>
                      {tps && (
                        <div className="absolute bottom-2 right-2 px-3 py-1 bg-primary-100/50 rounded-lg">
                          <span className="text-sm font-medium text-primary-700">
                            {tps.toFixed(1)} tokens/sec
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-primary-900">Input Language</h2>
                      <p className="text-sm text-primary-700">Select the language you're speaking in</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <LanguageSelector
                        language={language}
                        setLanguage={(e) => {
                          recorderRef.current?.stop();
                          setLanguage(e);
                          languageRef.current = e;
                          recorderRef.current?.start();
                        }}
                      />
                      <button
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                        onClick={() => {
                          recorderRef.current?.stop();
                          recorderRef.current?.start();
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="w-full max-w-2xl backdrop-blur-sm bg-white/30 rounded-2xl p-8 shadow-xl border border-white/50">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-primary-900 mb-2">Loading Models</h2>
                  <p className="text-lg text-primary-800">{loadingMessage}</p>
                </div>
                <div className="space-y-6">
                  {progressItems.map(({ file, progress, total }, i) => (
                    <Progress
                      key={i}
                      text={file}
                      percentage={progress}
                      total={total}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-900 to-accent-dark text-white text-2xl font-semibold flex flex-col justify-center items-center text-center p-6 space-y-4">
      <span className="text-4xl">😢</span>
      <p>WebGPU is not supported by this browser</p>
      <p className="text-lg text-primary-200">Try using Chrome Canary or another browser with WebGPU support</p>
    </div>
  );
}

export default App;
