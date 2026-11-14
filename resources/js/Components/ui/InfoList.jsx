/**
 * Daftar keterangan "label · nilai". item: [{ label, nilai }]
 */
export default function InfoList({ item = [] }) {
    return (
        <dl className="space-y-4 text-sm">
            {item.map((i) => (
                <div key={i.label} className="flex gap-2">
                    <dt className="shrink-0 text-ink-600">{i.label}</dt>
                    <dd className="text-ink-600" aria-hidden="true">
                        ·
                    </dd>
                    <dd className="text-ink-900">{i.nilai}</dd>
                </div>
            ))}
        </dl>
    );
}
