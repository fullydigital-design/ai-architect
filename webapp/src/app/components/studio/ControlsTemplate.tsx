import { ReactNode } from 'react';
import { Grid3x3, X } from 'lucide-react';

/**
 * DESIGN TEMPLATE - Extracted from Google Gemini Studio
 * 
 * This is the EXACT design from Google's CONTROLS panel.
 * Use this template for ALL providers to maintain consistent design.
 * Only change: content inside sections, not the layout/styling!
 */

interface ControlsTemplateProps {
  children: ReactNode;
  onClose?: () => void;
}

export function ControlsTemplate({ children, onClose }: ControlsTemplateProps) {
  return (
    <div className="w-96 p-3 overflow-y-auto">
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        {/* Header - EXACT from Google */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-content-secondary" strokeWidth={1.5} />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">CONTROLS</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-content-secondary hover:text-content-faint">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Content - EXACT from Google */}
        <div className="px-6 py-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * SECTION CARD - Rounded card wrapper for each control section
 * EXACT design from Google Gemini
 */
interface SectionCardProps {
  children: ReactNode;
}

export function SectionCard({ children }: SectionCardProps) {
  return (
    <div className="bg-gray-50/50 rounded-2xl p-4">
      {children}
    </div>
  );
}

/**
 * LABEL - Section label style
 * EXACT from Google Gemini
 */
interface LabelProps {
  children: ReactNode;
}

export function Label({ children }: LabelProps) {
  return (
    <label className="block text-xs font-bold text-content-muted uppercase tracking-wide mb-3">
      {children}
    </label>
  );
}

/**
 * SELECT FIELD - Dropdown select
 * EXACT from Google Gemini - NO BORDER!
 */
interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectField({ value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm appearance-none cursor-pointer"
      style={{ border: 'none', boxShadow: 'none' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * TEXTAREA FIELD - Multi-line text input
 * EXACT from Google Gemini - NO BORDER!
 */
interface TextareaFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextareaField({ value, onChange, placeholder, rows = 4 }: TextareaFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none resize-none font-medium text-sm"
      style={{ border: 'none', boxShadow: 'none' }}
    />
  );
}

/**
 * INPUT FIELD - Single-line text input
 * EXACT from Google Gemini - NO BORDER!
 */
interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function InputField({ value, onChange, placeholder, type = 'text' }: InputFieldProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white rounded-xl focus:outline-none font-medium text-sm"
      style={{ border: 'none', boxShadow: 'none' }}
    />
  );
}

/**
 * TOGGLE SWITCH - On/Off toggle
 * EXACT from Google Gemini
 */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-xs text-content-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * BUTTON GRID - Grid of selection buttons
 * EXACT from Google Gemini
 */
interface ButtonGridProps {
  options: Array<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
  columns?: number;
  gradient?: string;
}

export function ButtonGrid({ options, selected, onChange, columns = 3, gradient = 'from-purple-500 to-pink-500' }: ButtonGridProps) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
            selected === option.value
              ? `bg-gradient-to-r ${gradient} text-white shadow-md`
              : 'bg-white text-content-faint hover:bg-gray-50'
          }`}
          style={selected !== option.value ? { border: 'none' } : undefined}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * GENERATE BUTTON - Primary action button
 * EXACT from Google Gemini
 */
interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  gradient?: string;
}

export function GenerateButton({ 
  onClick, 
  disabled = false, 
  loading = false, 
  text = 'Generate',
  gradient = 'from-purple-500 to-pink-500'
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-xl bg-gradient-to-r ${gradient} text-white font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        text
      )}
    </button>
  );
}

/**
 * UPLOAD AREA - Drag & drop / file upload zone
 * EXACT from Google Gemini
 */
interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export function UploadArea({ onFileSelect, label, description, icon }: UploadAreaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <label className="block cursor-pointer">
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors">
        {icon && <div className="flex justify-center mb-2">{icon}</div>}
        <p className="text-sm font-medium text-content-faint">{label}</p>
        {description && <p className="text-xs text-content-muted mt-1">{description}</p>}
      </div>
      <input
        type="file"
        onChange={handleChange}
        className="hidden"
        accept="image/*"
      />
    </label>
  );
}

/**
 * HELPER TEXT - Small gray text below fields
 * EXACT from Google Gemini
 */
interface HelperTextProps {
  children: ReactNode;
  emoji?: string;
}

export function HelperText({ children, emoji }: HelperTextProps) {
  return (
    <p className="mt-2 text-xs text-content-muted font-medium flex items-start gap-1">
      {emoji && <span>{emoji}</span>}
      <span>{children}</span>
    </p>
  );
}
