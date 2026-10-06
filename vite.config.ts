import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,
            scope: '/',
            srcDir: 'resources/js',
            filename: 'sw.ts',
            strategies: 'injectManifest',
            includeAssets: [
                'favicon.ico',
                'favicon.svg',
                'apple-touch-icon.png',
                'robots.txt',
                'offline.html',
                'pwa-192.png',
                'pwa-512.png',
                'pwa-512-maskable.png',
            ],
            manifest: {
                name: 'How much money',
                short_name: 'HMM',
                description: 'Финансовые периоды и расходы',
                lang: 'ru',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#f7f3ee',
                theme_color: '#1c1a17',
                icons: [
                    {
                        src: '/pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            injectManifest: {
                additionalManifestEntries: [
                    { url: '/offline.html', revision: null },
                ],
            },
            devOptions: {
                enabled: true,
            },
            buildBase: '/build/',
        }),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        hmr: {
            host: 'localhost',
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
});
