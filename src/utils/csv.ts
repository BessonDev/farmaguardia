/**
 * Parser CSV minimalista (RFC 4180 básico): soporta comillas dobles,
 * comas dentro de campos y saltos de línea. No maneja CRLF especial.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      // Saltar \r\n
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += char;
    }
  }

  // Última fila si quedó contenido
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Normaliza una fila: recorta espacios y elimina filas vacías.
 */
export function parseCsvClean(text: string): string[][] {
  return parseCsv(text)
    .map(row => row.map(cell => cell.trim()))
    .filter(row => row.some(cell => cell !== ''));
}
