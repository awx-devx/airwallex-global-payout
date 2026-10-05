export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(color: string): number {
  const [red, green, blue] = parseColor(color)
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

function channel(value: number): number {
  const unit = value / 255
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function parseColor(input: string): [number, number, number] {
  const color = input.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(color)
  if (short?.[1]) {
    const [red, green, blue] = short[1].split('')
    if (red && green && blue) {
      return [parseInt(red + red, 16), parseInt(green + green, 16), parseInt(blue + blue, 16)]
    }
  }
  const long = /^#([0-9a-f]{6})$/i.exec(color)
  if (long?.[1]) {
    const value = parseInt(long[1], 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(color)
  if (rgb?.[1] && rgb[2] && rgb[3]) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`Unreadable color: ${input}`)
}
