import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },

            // Palet mengikuti desain Figma "SIM Aset FTI". Seluruh tampilan memakai nama warna di bawah
            // (bukan kode hex), jadi cukup ubah di sini bila palet berubah.
            colors: {
                // hijau utama: judul, tombol, tautan, item menu aktif
                brand: {
                    50: '#eaf4ee',
                    100: '#d3e8db',
                    200: '#a9d1ba',
                    300: '#7bb596',
                    400: '#4a9672',
                    500: '#2a7c58',
                    600: '#1b6e4e',
                    700: '#155b40',
                    800: '#104833',
                    900: '#0b3625',
                },
                // teks: 900 judul dan isi, 600 teks pendukung, 500 teks redup, 400 placeholder
                ink: {
                    900: '#13302a',
                    600: '#4f625c',
                    500: '#6b7c76',
                    400: '#93a19b',
                },
                surface: '#f4f6f5', // latar halaman
                line: '#e2e8e4', // garis dan border
                // status: peringatan (kuning), bahaya (merah), info (biru)
                warn: { 50: '#fef3dd', 600: '#a16a1a', 700: '#8a5a14' },
                bahaya: { 50: '#fbebea', 600: '#b03a36' },
                info: { 50: '#e8f1f7', 600: '#2f6a93' },
            },

            borderRadius: {
                kartu: '0.75rem',
            },
        },
    },

    plugins: [forms],
};
