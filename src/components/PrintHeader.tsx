interface PrintHeaderProps {
  title: string;
  filters: { label: string; value: string }[];
}

export default function PrintHeader({ title, filters }: PrintHeaderProps) {
  const activeFilters = filters.filter((f) => f.value);
  return (
    <div className="hidden print:block mb-4">
      <h1 className="text-xl font-black text-slate-900">{title}</h1>
      {activeFilters.length > 0 && (
        <p className="text-xs text-slate-600 mt-1">
          {activeFilters.map((f) => `${f.label}: ${f.value}`).join(" · ")}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-0.5">
        Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <hr className="mt-3 border-slate-300" />
    </div>
  );
}
