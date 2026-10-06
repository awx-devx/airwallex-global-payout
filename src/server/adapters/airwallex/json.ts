/** Parse JSON without turning amounts into JS numbers. Number tokens stay decimal strings. */
export function parseJsonLossless(text: string): unknown {
  return JSON.parse(quoteJsonNumbers(text)) as unknown
}

export function quoteJsonNumbers(text: string): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '"') {
      const end = skipString(text, index)
      out += text.slice(index, end)
      index = end
      continue
    }
    if (char === '-' || isDigit(char)) {
      const end = skipNumber(text, index)
      if (end > index) {
        out += `"${text.slice(index, end)}"`
        index = end
        continue
      }
    }
    out += char ?? ''
    index += 1
  }
  return out
}

function skipString(text: string, start: number): number {
  let index = start + 1
  while (index < text.length) {
    const char = text[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === '"') return index + 1
    index += 1
  }
  return text.length
}

function skipNumber(text: string, start: number): number {
  let index = start
  if (text[index] === '-') index += 1
  if (text[index] === '0') {
    index += 1
  } else if (isDigit(text[index])) {
    while (isDigit(text[index])) index += 1
  } else {
    return start
  }
  if (text[index] === '.') {
    const mark = index
    index += 1
    if (!isDigit(text[index])) return start
    while (isDigit(text[index])) index += 1
    if (index === mark + 1) return start
  }
  if (text[index] === 'e' || text[index] === 'E') {
    const mark = index
    index += 1
    if (text[index] === '+' || text[index] === '-') index += 1
    if (!isDigit(text[index])) return start
    while (isDigit(text[index])) index += 1
    if (index === mark + 1) return start
  }
  return index
}

function isDigit(char: string | undefined): boolean {
  return char != null && char >= '0' && char <= '9'
}
