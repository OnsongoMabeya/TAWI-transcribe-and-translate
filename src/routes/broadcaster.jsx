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
          
          <div className="flex flex-col items-center mb-8 animate-float">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary-900 to-accent-dark">
              TAWI - Broadcaster
            </h1>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold text-primary-900">
                Real-time in-browser speech recognition
              </h2>
              <h2 className="text-2xl font-semibold text-primary-900">
                & decentralized in-browser TAWI AI translation
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-6">
            {status === null && (
              <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-8 shadow-xl border border-white/50 transform transition-all hover:scale-[1.02]">
                <p className="text-lg text-primary-900 leading-relaxed">
                  <br />
                  You are about to load{' '}
                  <a
                    href="https://huggingface.co/onnx-community/whisper-base"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent-dark hover:text-accent transition-colors underline"
                  >
                    whisper-base
                  </a>
                  , a 73 million parameter speech recognition model that is
                  optimized for inference on the web. Once downloaded, the model
                  (~200&nbsp;MB) will be cached and reused when you revisit the
                  page.
                  <br />
                  <br />
                  Everything runs directly in your browser using{' '}
                  <a
                    href="https://huggingface.co/docs/transformers.js"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent-dark hover:text-accent transition-colors underline"
                  >
                    🤗&nbsp;Transformers.js
                  </a>
                  {' '}and ONNX Runtime Web, meaning no data is sent to a server.
                </p>

                <button
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-accent hover:from-primary-600 hover:to-accent-dark text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    worker.current.postMessage({ type: 'load' });
                    setStatus('loading');
                  }}
                  disabled={status !== null}
                >
                  START TRANSCRIBING
                </button>
              </div>
            )}

            {status === 'ready' && (
              <div className="w-full space-y-6">
                <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                  <p className="text-lg text-primary-900 mb-4">
                    Your Broadcast Channel ID is{' '}
                    <pre className="inline-block bg-primary-100/50 py-1 px-3 rounded-lg text-primary-700 font-medium">
                      {channelId.current}
                    </pre>
                  </p>
                  <a
                    href={`${import.meta.env.BASE_URL}#/receiver/${channelId.current}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full text-center px-6 py-3 bg-gradient-to-r from-primary-500 to-accent text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] hover:from-primary-600 hover:to-accent-dark"
                  >
                    {`${import.meta.env.VITE_DOMAIN}${import.meta.env.BASE_URL}#/receiver/${channelId.current}`}
                  </a>
                </div>

                <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                  <AudioVisualizer className="w-full rounded-xl mb-4" stream={stream} />
                  <div className="relative">
                    <div className="w-full h-[80px] overflow-y-auto overflow-wrap-anywhere rounded-xl bg-white/50 p-4 font-medium text-primary-900">
                      {text}
                    </div>
                    {tps && (
                      <span className="absolute bottom-2 right-2 px-2 py-1 bg-primary-100/50 rounded-lg text-sm text-primary-700">
                        {tps.toFixed(2)} tok/s
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative w-full flex justify-between items-center backdrop-blur-sm bg-white/30 rounded-2xl p-4 shadow-xl border border-white/50">
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
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    onClick={() => {
                      recorderRef.current?.stop();
                      recorderRef.current?.start();
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {status === 'loading' && (
              <div className="w-full max-w-[500px] backdrop-blur-sm bg-white/30 rounded-2xl p-6 shadow-xl border border-white/50">
                <p className="text-center text-lg text-primary-900 mb-4">{loadingMessage}</p>
                {progressItems.map(({ file, progress, total }, i) => (
                  <Progress
                    key={i}
                    text={file}
                    percentage={progress}
                    total={total}
                  />
                ))}
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
