import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('vat_theme') as Theme) || 'light');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('vat_theme', theme);
    }, [theme]);

    return { theme, setTheme };
}
