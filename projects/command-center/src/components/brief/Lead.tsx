interface LeadProps {
  text: string;
}

export default function Lead({ text }: LeadProps) {
  return (
    <div className="font-display text-[20px] font-normal leading-[1.55] text-text-primary py-7 border-t border-border">
      {text}
    </div>
  );
}
