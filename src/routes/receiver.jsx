import { useEffect, useRef, useState } from 'react';
import LanguageSelector from '../components/LanguageSelectorReceiver';
import Progress from '../components/Progress';
import GitHubLink from '../components/GitHubLink';
import { LANGUAGES, languageMapping } from '../utils/languages';
import { useParams } from 'react-router-dom';

function App({ supabase }) {
  // Model loading
  const [ready, setReady] = useState(null);
  const disabled = useRef(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState('Hallo.');
  const inputRef = useRef(input);
  const [sourceLanguage, setSourceLanguage] = useState('deu_Latn');
  const sourceLanguageRef = useRef(sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState('eng_Latn');
  const targetLanguageRef = useRef(targetLanguage);
  const [output, setOutput] = useState('');

  // Broadcast
  const { channelId } = useParams();

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(
        new URL('../translationWorker.js', import.meta.url),
        {
          type: 'module',
        }
      );
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
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
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case 'complete':
          setOutput(e.data.output[0].translation_text);
          disabled.current = false;
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current.removeEventListener('message', onMessageReceived);
  });

  const translate = () => {
    if (disabled.current) return;
    if (sourceLanguageRef.current === targetLanguageRef.current) {
      setOutput(inputRef.current);
      return;
    }
    disabled.current = true;
    console.log('Translating...');
    worker.current.postMessage({
      text: inputRef.current,
      src_lang: sourceLanguageRef.current,
      tgt_lang: targetLanguageRef.current,
    });
  };

  // Start on load
  useEffect(() => {
    translate();
    // Subscribe to Supabase realtime broadcast
    const channel = supabase.channel(channelId);
    channel
      .on('broadcast', { event: 'transcript' }, ({ payload }) => {
        setInput(payload.message);
        inputRef.current = payload.message;
        setSourceLanguage(languageMapping[payload.language]);
        sourceLanguageRef.current = languageMapping[payload.language];
        translate();
      })
      .subscribe();
  }, []);

  return (
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
                TAWI - Receiver
              </h1>
              <div className="max-w-2xl mx-auto">
                <p className="text-2xl font-medium text-primary-800 leading-relaxed">
                  Real-time in-browser speech recognition & decentralized AI translation
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-8 w-full max-w-3xl mx-auto">
            <div className="w-full space-y-6">
              <div className="backdrop-blur-sm bg-white/30 rounded-2xl p-8 shadow-xl border border-white/50">
                <div className="space-y-6">
                  {/* Transcript Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-primary-900">Transcript</h2>
                      <div className="px-4 py-2 bg-white/50 rounded-xl">
                        <span className="text-sm font-medium text-primary-700">
                          Source Language:{' '}
                          <span className="text-accent-dark font-semibold">
                            {Object.entries(LANGUAGES).find(
                              ([key, val]) => val === sourceLanguage
                            )?.[0] || 'Auto-detect'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="w-full min-h-[120px] overflow-y-auto overflow-wrap-anywhere rounded-xl bg-white/50 p-4 font-medium text-primary-900">
                      {input || 'Waiting for broadcast...'}
                    </div>
                  </div>

                  {/* Translation Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-primary-900">Translation</h2>
                      <LanguageSelector
                        type={'Target'}
                        defaultLanguage={targetLanguage}
                        onChange={(x) => {
                          setTargetLanguage(x.target.value);
                          targetLanguageRef.current = x.target.value;
                          translate();
                        }}
                      />
                    </div>
                    <div className="w-full min-h-[120px] overflow-y-auto overflow-wrap-anywhere rounded-xl bg-white/50 p-4 font-medium text-primary-900">
                      {output || 'Translation will appear here...'}
                    </div>
                  </div>
                </div>
              </div>

              {ready === false && (
                <div className="w-full backdrop-blur-sm bg-white/30 rounded-2xl p-8 shadow-xl border border-white/50">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-primary-900 mb-2">Loading Translation Models</h2>
                    <p className="text-lg text-primary-800">This will only happen once</p>
                  </div>
                  <div className="space-y-6">
                    {progressItems.map((data) => (
                      <Progress
                        key={data.file}
                        text={data.file}
                        percentage={data.progress}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
