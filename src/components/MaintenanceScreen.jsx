export default function MaintenanceScreen({ from, to }) {
  function fmt(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const fromStr = fmt(from);
  const toStr = fmt(to);

  return (
    <div className="fixed inset-0 bg-[#07070a] flex flex-col items-center justify-center text-white z-[9999]">
      <p className="text-white text-lg font-medium mb-2">azov is in maintenance</p>
      {(fromStr || toStr) && (
        <p className="text-zinc-500 text-sm">
          {fromStr || '?'} — {toStr || '?'}
        </p>
      )}
    </div>
  );
}
