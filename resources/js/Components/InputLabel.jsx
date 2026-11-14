export default function InputLabel({ value, className = '', children, ...props }) {
    return (
        <label {...props} className={`block text-sm font-medium text-ink-900 ` + className}>
            {value ? value : children}
        </label>
    );
}
