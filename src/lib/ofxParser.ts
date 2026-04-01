export interface OFXTransaction {
  id: string; // FITID
  type: string; // TRNTYPE (CREDIT/DEBIT)
  date: Date; // DTPOSTED
  amount: number; // TRNAMT
  memo: string; // MEMO
}

/**
 * Parses an OFX string content and extracts banking transactions.
 * Uses Regex to avoid heavy XML/SGML library dependencies, perfectly fit for constrained environments.
 */
export function parseOFX(ofxContent: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  
  // A simple regex approach for SGML/OFX parsing
  // Matches any content between <STMTTRN> and </STMTTRN>
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
    const trnBlock = match[1];

    // Some OFX files skip closing tags, so we match up to the next newline or `<`
    const typeMatch = trnBlock.match(/<TRNTYPE>(.*?)[\r\n<]/);
    const dateMatch = trnBlock.match(/<DTPOSTED>(.*?)[\r\n<]/);
    const amountMatch = trnBlock.match(/<TRNAMT>(.*?)[\r\n<]/);
    const idMatch = trnBlock.match(/<FITID>(.*?)[\r\n<]/);
    const memoMatch = trnBlock.match(/<MEMO>(.*?)[\r\n<]/);

    if (dateMatch && amountMatch) {
      // OFX dates are generally YYYYMMDDHHMMSS or YYYYMMDD
      const dateStr = dateMatch[1].trim();
      let year = new Date().getFullYear();
      let month = new Date().getMonth();
      let day = new Date().getDate();
      
      if (dateStr.length >= 8) {
        year = parseInt(dateStr.substring(0, 4), 10);
        month = parseInt(dateStr.substring(4, 6), 10) - 1;
        day = parseInt(dateStr.substring(6, 8), 10);
      }
      
      const parsedDate = new Date(year, month, day);

      transactions.push({
        type: typeMatch ? typeMatch[1].trim() : 'OTHER',
        date: parsedDate,
        amount: parseFloat(amountMatch[1].trim().replace(',', '.')),
        id: idMatch ? idMatch[1].trim() : Math.random().toString(36).substring(7),
        memo: memoMatch ? memoMatch[1].trim() : 'Transação Desconhecida'
      });
    }
  }

  // Fallback se não bater tag <STMTTRN> certinho e sim sem fechar, como <STMTTRN> ... <TRNTYPE> etc.
  // Muitas vezes OFX é puro <STMTTRN> seguido de tags e sem </STMTTRN>, terminado ao iniciar o próximo <STMTTRN>
  if (transactions.length === 0) {
      const parts = ofxContent.split('<STMTTRN>');
      // skip the first part before first <STMTTRN>
      for (let i = 1; i < parts.length; i++) {
          const trnBlock = parts[i];
          const typeMatch = trnBlock.match(/<TRNTYPE>(.*?)[\r\n<]/);
          const dateMatch = trnBlock.match(/<DTPOSTED>(.*?)[\r\n<]/);
          const amountMatch = trnBlock.match(/<TRNAMT>(.*?)[\r\n<]/);
          const idMatch = trnBlock.match(/<FITID>(.*?)[\r\n<]/);
          const memoMatch = trnBlock.match(/<MEMO>(.*?)[\r\n<]/);

          if (dateMatch && amountMatch) {
              const dateStr = dateMatch[1].trim();
              let year = new Date().getFullYear();
              let month = new Date().getMonth();
              let day = new Date().getDate();
              
              if (dateStr.length >= 8) {
                  year = parseInt(dateStr.substring(0, 4), 10);
                  month = parseInt(dateStr.substring(4, 6), 10) - 1;
                  day = parseInt(dateStr.substring(6, 8), 10);
              }
              
              const parsedDate = new Date(year, month, day);

              transactions.push({
                  type: typeMatch ? typeMatch[1].trim() : 'OTHER',
                  date: parsedDate,
                  amount: parseFloat(amountMatch[1].trim().replace(',', '.')),
                  id: idMatch ? idMatch[1].trim() : Math.random().toString(36).substring(7),
                  memo: memoMatch ? memoMatch[1].trim() : 'Transação Desconhecida'
              });
          }
      }
  }

  return transactions;
}
