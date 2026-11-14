/**
 * Jejak halaman. butir: ['FTI', 'Dashboard'] (teks biasa).
 */
export default function Breadcrumb({ butir = [], className = '' }) {
    return (
        <nav aria-label="Jejak halaman" className={`text-xs text-ink-500 ${className}`}>
            {butir.map((teks, i) => (
                <span key={i}>
                    {i > 0 && <span className="mx-1.5">/</span>}
                    <span className={i === butir.length - 1 ? 'text-ink-600' : ''}>{teks}</span>
                </span>
            ))}
        </nav>
    );
}
