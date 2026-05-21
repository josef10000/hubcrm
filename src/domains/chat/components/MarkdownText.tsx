import React from 'react';

interface MarkdownTextProps {
  text: string;
  isMine: boolean;
}

export default function MarkdownText({ text, isMine }: MarkdownTextProps) {
  if (!text) return null;

  // 1. Separar o texto por blocos de código (delimitados por ```)
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = text.split(codeBlockRegex);

  return (
    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium space-y-1">
      {parts.map((part, index) => {
        // Se for um bloco de código
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).trim();
          // Tenta extrair a linguagem (primeira palavra se não houver quebra de linha)
          const firstLineBreak = content.indexOf('\n');
          let language = '';
          let code = content;
          
          if (firstLineBreak > 0 && firstLineBreak < 15) {
            language = content.slice(0, firstLineBreak).trim();
            code = content.slice(firstLineBreak + 1);
          }

          return (
            <div key={index} className="my-2 select-all font-mono text-xs rounded-2xl overflow-hidden border border-white/10 dark:border-white/5 shadow-lg">
              {language && (
                <div className="bg-zinc-800 dark:bg-zinc-900 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/5 flex justify-between items-center">
                  <span>{language}</span>
                  <span className="text-[9px] lowercase opacity-50">bloco de código</span>
                </div>
              )}
              <pre className="bg-zinc-950 p-4 text-zinc-100 overflow-x-auto custom-scrollbar font-mono leading-relaxed text-left">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Se for texto comum, processar linha por linha (para blockquotes, listas, etc.)
        const lines = part.split('\n');
        return (
          <React.Fragment key={index}>
            {lines.map((line, lineIndex) => {
              // Tratar Citações (Blockquotes: começar com "> ")
              if (line.startsWith('>') && (line[1] === ' ' || line[1] === undefined)) {
                const quoteContent = line.slice(1).trim();
                return (
                  <blockquote
                    key={lineIndex}
                    className="border-l-4 border-primary-500 pl-3 my-1.5 italic text-gray-700 dark:text-gray-300 opacity-90 text-left bg-gray-500/5 py-1 pr-3 rounded-r-xl"
                  >
                    {renderInlineStyles(quoteContent, isMine)}
                  </blockquote>
                );
              }

              // Tratar listas não ordenadas simples (começar com "- " ou "* ")
              if ((line.startsWith('- ') || line.startsWith('* ')) && line.length > 2) {
                const listContent = line.slice(2).trim();
                return (
                  <ul key={lineIndex} className="list-disc pl-5 my-1 text-left">
                    <li>{renderInlineStyles(listContent, isMine)}</li>
                  </ul>
                );
              }

              // Renderizar linha comum com formatação inline
              return (
                <div key={lineIndex} className="min-h-[1.25rem]">
                  {renderInlineStyles(line, isMine)}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Renderiza formatações inline (Negrito, Itálico, Código Inline e Menções)
function renderInlineStyles(text: string, isMine: boolean): React.ReactNode[] {
  if (!text) return [];

  // Regex para segmentar por menções (@nome), código inline (`código`), negrito (**negrito**) e itálico (*itálico* ou _itálico_)
  // Usamos grupos de captura para incluir os delimitadores no split e poder tratá-los
  const inlineRegex = /(@todos|@everyone|@[a-zA-Z0-9_\u00C0-\u017F]+|`[^`\n]+`|\*\*[^*]+?\*\*|\*[^*]+?\*|_[^_]+?_)/g;
  
  const tokens = text.split(inlineRegex);

  return tokens.map((token, i) => {
    // 1. Código Inline (delimitado por ` `)
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      return (
        <code
          key={i}
          className="bg-gray-100 dark:bg-white/10 text-rose-500 dark:text-rose-400 font-mono text-xs px-1.5 py-0.5 rounded-lg border border-gray-200 dark:border-white/5 mx-0.5"
        >
          {code}
        </code>
      );
    }

    // 2. Negrito (delimitado por **)
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      return <strong key={i} className="font-extrabold text-gray-900 dark:text-white">{boldText}</strong>;
    }

    // 3. Itálico (delimitado por * ou _)
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      const italicText = token.slice(1, -1);
      return <em key={i} className="italic opacity-90">{italicText}</em>;
    }

    // 4. Menções (delimitadas por @)
    const mentionRegex = /(@todos|@everyone|@[a-zA-Z0-9_\u00C0-\u017F]+)/;
    if (mentionRegex.test(token)) {
      return (
        <span
          key={i}
          className={`font-black tracking-tight ${
            isMine ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'
          } cursor-pointer transition-colors`}
          title={`Menção: ${token}`}
        >
          {token}
        </span>
      );
    }

    // Texto livre comum
    return token;
  });
}
