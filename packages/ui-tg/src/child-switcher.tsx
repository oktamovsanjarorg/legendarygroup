export interface ChildTab {
  id: string;
  name: string;
}

interface Props {
  items: readonly ChildTab[];
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}

/** Farzand almashtirgich (MG-01/02/05): bitta bo'lsa — chizilmaydi. */
export function ChildSwitcher({ items, selected, onSelect, label }: Props) {
  if (items.length < 2) return null;
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto px-2 pb-1">
      {items.map((c) => {
        const on = c.id === selected;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(c.id)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium ${on ? 'bg-primary text-primary-text' : 'bg-bg text-text'}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
