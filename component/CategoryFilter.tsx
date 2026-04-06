"use client";

export const CATEGORIES = [
  { key: "all" },
  { key: "comida" },
  { key: "tours" },
  { key: "hospedaje" },
  { key: "artesanias" },
  { key: "entretenimiento" },
];

export const CATEGORY_LABELS_ES: Record<string, string> = {
  all:             "Todos",
  comida:          "Comida",
  tours:           "Tours",
  hospedaje:       "Hospedaje",
  artesanias:      "Artesanías",
  entretenimiento: "Entretenimiento",
};

interface Props {
  active: string;
  onChange: (category: string) => void;
  labels?: Record<string, string>;
}

export default function CategoryFilter({ active, onChange, labels }: Props) {
  const display = labels ?? CATEGORY_LABELS_ES;
  return (
    <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
      {CATEGORIES.map(({ key }) => (
        <button key={key} onClick={() => onChange(key)}
          className={`cat-pill${active === key ? " active" : ""}`}>
          {display[key]}
        </button>
      ))}
    </div>
  );
}