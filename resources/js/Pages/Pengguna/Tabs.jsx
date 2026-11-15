import TabNav from '@/Components/ui/TabNav';

/**
 * Tab untuk kelompok halaman menu "Pengguna & hak akses".
 * aktif: 'akun' | 'unit' | 'hak-akses' | 'log'.
 */
export default function Tabs({ aktif }) {
    return (
        <TabNav
            tab={[
                { label: 'Akun pengguna', href: route('pengguna.index'), aktif: aktif === 'akun' },
                { label: 'Unit & sub-unit', href: route('unit.index'), aktif: aktif === 'unit' },
                { label: 'Hak akses', href: route('hak-akses.index'), aktif: aktif === 'hak-akses' },
                { label: 'Log aktivitas', href: route('log-aktivitas.index'), aktif: aktif === 'log' },
            ]}
        />
    );
}
