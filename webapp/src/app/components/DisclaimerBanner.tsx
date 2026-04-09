import { AlertTriangle } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div className="fixed top-[73px] left-0 right-0 z-40 bg-amber-50 border-b-2 border-amber-200">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-center gap-3 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900 font-semibold">
            <span className="font-black">Demonstration Project:</span> Non-commercial prototype for personal use and portfolio purposes. Not intended for commercial use. Use at your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}