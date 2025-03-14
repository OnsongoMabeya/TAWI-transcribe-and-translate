function formatBytes(size) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
}

export default function Progress({ text, percentage, total }) {
  percentage ??= 0;
  return (
    <div className="relative w-full mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-primary-900">{text}</span>
        <span className="text-sm font-medium text-primary-700">
          {percentage.toFixed(1)}%
          {!isNaN(total) && ` of ${formatBytes(total)}`}
        </span>
      </div>
      <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
