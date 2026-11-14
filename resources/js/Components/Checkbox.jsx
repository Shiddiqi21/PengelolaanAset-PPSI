export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-ink-400 text-brand-600 focus:ring-brand-600 ' +
                className
            }
        />
    );
}
