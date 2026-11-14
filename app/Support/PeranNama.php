<?php

namespace App\Support;

final class PeranNama
{
    public const OPERATOR = 'Operator Aset Fakultas';

    public const PIMPINAN = 'Pimpinan';

    public const KEPALA_KANTOR = 'Kepala Kantor';

    public const PEMOHON = 'Pemohon';

    public const PEGAWAI = 'Pegawai/Dosen';

    public const TEKNISI = 'Teknisi Fakultas';

    public const SLUG = [
        'operator' => self::OPERATOR,
        'pimpinan' => self::PIMPINAN,
        'kepala-kantor' => self::KEPALA_KANTOR,
        'pemohon' => self::PEMOHON,
        'pegawai' => self::PEGAWAI,
        'teknisi' => self::TEKNISI,
    ];
}
