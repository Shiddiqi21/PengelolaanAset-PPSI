export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p {...props} className={'text-sm text-bahaya-600 ' + className}>
            {message}
        </p>
    ) : null;
}
