import { useMemo } from 'react';

type KaTeXRendererProps = {
    content: string;
    className?: string;
};

export function KaTeXRenderer({ content, className = '' }: KaTeXRendererProps) {
    const formattedHtml = useMemo(() => {
        if (!content) return '';

        let text = content;

        // 1. Extract Code Blocks (```lang ... ```)
        const codeBlocks: string[] = [];
        text = text.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
            const index = codeBlocks.length;
            const cleanCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            codeBlocks.push(`
                <div class="my-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden text-left font-mono">
                    <div class="flex items-center justify-between bg-slate-800/80 px-4 py-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700">
                        <span>💻 Code Snippet (${lang || 'plaintext'})</span>
                        <span>C++ / Python / JS</span>
                    </div>
                    <pre class="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">${cleanCode}</pre>
                </div>
            `);
            return `___CODE_BLOCK_${index}___`;
        });

        // 2. Sanitize remaining HTML tags
        text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // 3. Chemical formulas (H2SO4, Fe2O3, CH3COOH, H2O, CO2)
        text = text
            .replace(/H2SO4/g, 'H<sub>2</sub>SO<sub>4</sub>')
            .replace(/CH3COOH/g, 'CH<sub>3</sub>COOH')
            .replace(/Fe2O3/g, 'Fe<sub>2</sub>O<sub>3</sub>')
            .replace(/Fe2\(SO4\)3/g, 'Fe<sub>2</sub>(SO<sub>4</sub>)<sub>3</sub>')
            .replace(/NaOH/g, 'NaOH')
            .replace(/H2O/g, 'H<sub>2</sub>O')
            .replace(/CO2/g, 'CO<sub>2</sub>');

        // 4. Format Display LaTeX $$...$$
        text = text.replace(/\$\$(.*?)\$\$/g, (_match, math) => {
            return `<div class="katex-display my-2 rounded-xl bg-[var(--color-bg-soft)] p-3 text-center font-serif text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-300 border border-[var(--color-border)] shadow-xs">
                ${parseLatexToReadable(math)}
            </div>`;
        });

        // 5. Format Inline LaTeX $...$
        text = text.replace(/\$(.*?)\$/g, (_match, math) => {
            return `<span class="katex-inline font-serif font-semibold text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50">
                ${parseLatexToReadable(math)}
            </span>`;
        });

        // 6. Restore Code Blocks
        codeBlocks.forEach((block, index) => {
            text = text.replace(`___CODE_BLOCK_${index}___`, block);
        });

        return text;
    }, [content]);

    return (
        <div
            className={`prose dark:prose-invert max-w-none text-xs leading-relaxed text-[var(--color-text)] ${className}`}
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />
    );
}

function parseLatexToReadable(latex: string): string {
    let result = latex.trim();

    result = result
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-flex flex-col text-center align-middle mx-1 font-sans"><span class="border-b border-current px-1 text-[11px] leading-tight">$1</span><span class="px-1 text-[11px] leading-tight">$2</span></span>')
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
        .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)')
        .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫<sub>$1</sub><sup>$2</sup>')
        .replace(/\\int_([a-zA-Z0-9])\^([a-zA-Z0-9])/g, '∫<sub>$1</sub><sup>$2</sup>')
        .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑<sub>$1</sub><sup>$2</sup>')
        .replace(/\\sum/g, '∑')
        .replace(/\\infty/g, '∞')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\gamma/g, 'γ')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\pi/g, 'π')
        .replace(/\\epsilon/g, 'ε')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\theta/g, 'θ')
        .replace(/\\Omega/g, 'Ω')
        .replace(/\\mu/g, 'μ')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\vec\{([^}]+)\}/g, '<span class="overline">$1</span>')
        .replace(/\\cdot/g, '•')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈');

    result = result
        .replace(/\^2/g, '²')
        .replace(/\^3/g, '³')
        .replace(/\^([0-9a-zA-Z]+)/g, '<sup>$1</sup>')
        .replace(/_([0-9a-zA-Z]+)/g, '<sub>$1</sub>');

    return result;
}
