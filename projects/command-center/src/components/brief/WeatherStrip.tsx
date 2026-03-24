interface WeatherStripProps {
  weather: {
    temp: number;
    condition: string;
    detail: string;
    icon: string;
  };
}

export default function WeatherStrip({ weather }: WeatherStripProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-bg-card border border-border rounded-[10px] mb-1">
      <div className="text-[28px]">{weather.icon}</div>
      <div className="font-display text-[32px] font-medium text-accent-blue leading-none">
        {weather.temp}°
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-text-primary">
          {weather.condition}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">{weather.detail}</div>
      </div>
    </div>
  );
}
