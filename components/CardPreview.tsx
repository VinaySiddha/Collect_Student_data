interface CardPreviewProps {
  title: string;
  description: string;
}

export function CardPreview({ title, description }: CardPreviewProps) {
  return (
    <div className="glass-panel p-6 transition hover:-translate-y-1 hover:bg-slate-100/80">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
