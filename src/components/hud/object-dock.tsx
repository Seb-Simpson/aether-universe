import { bodies, bodyOrder, type BodyId } from "@/data/bodies";
export function ObjectDock({
  selected,
  onSelect,
}: {
  selected: BodyId;
  onSelect: (id: BodyId) => void;
}) {
  return (
    <nav className="object-dock" aria-label="Saturn system objects">
      {bodyOrder.map((id, index) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          aria-label={`Select ${bodies[id].name}`}
          aria-pressed={selected === id}
          className={`object-option ${selected === id ? "selected" : ""}`}
        >
          <span
            className={`object-mini mini-${id}`}
            aria-hidden="true"
            style={{ backgroundImage: `url(${bodies[id].texture})` }}
          />
          <span>{bodies[id].name}</span>
          <kbd aria-hidden="true">{index + 1}</kbd>
        </button>
      ))}
    </nav>
  );
}
