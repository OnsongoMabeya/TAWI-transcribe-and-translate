import { LANGUAGES } from '../utils/languages';

export default function LanguageSelector({ type, onChange, defaultLanguage }) {
  return (
    <div className="flex items-center space-x-3">
      <label className="text-lg font-medium text-primary-900">{type}:</label>
      <div className="relative">
        <select
          onChange={onChange}
          defaultValue={defaultLanguage}
          className="appearance-none w-48 px-4 py-2 bg-white/50 border border-white/50 text-primary-900 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {Object.entries(LANGUAGES).map(([key, value]) => (
            <option key={key} value={value} className="bg-white text-primary-900">
              {key}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary-900">
          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
