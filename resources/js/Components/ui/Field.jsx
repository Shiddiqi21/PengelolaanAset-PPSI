import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';

/**
 * Label + isian + pesan error (+ petunjuk) dalam satu blok.
 * Contoh: <Field label="Email" error={errors.email} htmlFor="email"><TextInput id="email" .../></Field>
 */
export default function Field({ label, error, petunjuk, htmlFor, className = '', children }) {
    return (
        <div className={className}>
            <InputLabel htmlFor={htmlFor} value={label} />
            <div className="mt-1">{children}</div>
            {petunjuk && !error && <p className="mt-1 text-xs text-ink-500">{petunjuk}</p>}
            <InputError className="mt-1" message={error} />
        </div>
    );
}
