import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}

export default function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-xs text-chronos-primary-400">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-input w-full"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #2d2d3d ${percentage}%, #2d2d3d 100%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
