export default function ApplicationLogo({
    varian = 'ikon',
    className = '',
    alt = 'Logo FTI Universitas Andalas',
    ...props
}) {
    const src = varian === 'penuh' ? '/images/logo-fti.png' : '/images/logo-fti-ikon.png';

    return (
        <img
            {...props}
            src={src}
            alt={alt}
            className={`object-contain ${className}`.trim()}
        />
    );
}
