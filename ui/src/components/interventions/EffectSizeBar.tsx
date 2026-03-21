interface EffectSizeBarProps {
  effectYears: number;
  maxEffect: number;
}

export default function EffectSizeBar({
  effectYears,
  maxEffect,
}: EffectSizeBarProps) {
  const absEffect = Math.abs(effectYears);
  const widthPercent = Math.min((absEffect / maxEffect) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-chronos-younger transition-all duration-500"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-chronos-younger">
        {effectYears > 0 ? '+' : ''}
        {effectYears.toFixed(1)} years
      </p>
    </div>
  );
}
