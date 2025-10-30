export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm uppercase tracking-wider text-neutral-600 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors duration-300 ${className} ${
          error ? 'border-red-500' : ''
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
