import { HANDLE_COLORS, DataType } from './types';

export function HandleLegend() {
  const handleTypes = [
    { type: DataType.TEXT, label: 'Text', emoji: '💬' },
    { type: DataType.IMAGE, label: 'Image', emoji: '🖼️' },
    { type: DataType.VIDEO, label: 'Video', emoji: '🎬' },
    { type: DataType.STYLE, label: 'Style', emoji: '🎨' },
    { type: DataType.PARAMETERS, label: 'Parameters', emoji: '⚙️' },
    { type: DataType.ANY, label: 'Any', emoji: '✨' },
  ];

  return (
    <div className="px-6 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center justify-between gap-8">
        {/* Handle Types */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-content-faint">Handle Types:</span>
          <div className="flex items-center gap-3">
            {handleTypes.map(({ type, label, emoji }) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: HANDLE_COLORS[type] }}
                />
                <span className="text-xs font-medium text-content-faint">
                  {emoji} {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="flex items-center gap-3 text-xs text-content-muted">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-bold">Del</kbd>
            <span className="font-medium">Delete</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-bold">Click</kbd>
            <span className="font-medium">Configure</span>
          </div>
        </div>
      </div>
    </div>
  );
}