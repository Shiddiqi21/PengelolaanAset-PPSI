import { forwardRef } from 'react';

/**
 * Isian dengan label mengambang (gaya halaman login). Wajib diberi id dan label.
 * Contoh: <FloatingInput id="username" label="Nama pengguna" wajib value={...} onChange={...} error={errors.username} />
 */
export default forwardRef(function FloatingInput({ id, label, wajib = false, error, className = '', ...props }, ref) {
    return (
        <div className={className}>
            <div className="relative">
                <input
                    {...props}
                    id={id}
                    ref={ref}
                    placeholder=" "
                    aria-invalid={error ? 'true' : undefined}
                    className={`peer block w-full rounded-xl border bg-white px-4 pb-2 pt-6 text-[15px] text-ink-900 focus:ring-brand-600 ${
                        error ? 'border-bahaya-600 focus:border-bahaya-600' : 'border-line focus:border-brand-600'
                    }`}
                />
                <label
                    htmlFor={id}
                    className="pointer-events-none absolute left-4 top-2 text-xs text-ink-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-focus:top-2 peer-focus:text-xs peer-focus:text-brand-600"
                >
                    {label}
                    {wajib && <span className="text-bahaya-600"> *</span>}
                </label>
            </div>
            {error && <p className="mt-1.5 text-sm text-bahaya-600">{error}</p>}
        </div>
    );
});
