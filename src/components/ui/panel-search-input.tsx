type PanelSearchInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function PanelSearchInput({
  label,
  placeholder,
  value,
  onChange,
}: PanelSearchInputProps) {
  return (
    <div>
      <label
        htmlFor={label}
        className="uk-eyebrow mb-2 block text-xs uppercase tracking-[0.28em]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={label}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="uk-input min-h-12 w-full rounded-2xl px-12 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-500"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {value ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
