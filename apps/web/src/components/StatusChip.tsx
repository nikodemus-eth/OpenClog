export function StatusChip(props: { label: string; status: string; tone: "success" | "info" | "warning" | "danger" }) {
  return (
    <span aria-label={`${props.label} status: ${props.status}`} className={`status-chip ${props.tone}`}>
      <span aria-hidden="true" className="status-dot" />
      Status: {props.status}
    </span>
  );
}
