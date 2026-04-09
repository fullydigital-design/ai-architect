import { DataType } from '../workflow/types';

interface ConnectionValidatorProps {
  sourceType?: DataType;
  targetType?: DataType;
  isValid: boolean;
}

export function ConnectionValidator({ sourceType, targetType, isValid }: ConnectionValidatorProps) {
  if (!sourceType || !targetType) return null;

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg border-2 transition-all ${
      isValid 
        ? 'bg-green-50 border-green-300 text-green-700'
        : 'bg-red-50 border-red-300 text-red-700'
    }`}>
      <div className="flex items-center gap-2 text-xs font-bold">
        <span>{isValid ? '✅' : '❌'}</span>
        <span>
          {isValid 
            ? `Valid: ${sourceType} → ${targetType}`
            : `Invalid: ${sourceType} ≠ ${targetType}`
          }
        </span>
      </div>
    </div>
  );
}
