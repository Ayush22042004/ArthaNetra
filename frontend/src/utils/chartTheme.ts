// ECharts paints its own canvas/SVG, so CSS theme variables cannot recolor its labels.
export const withChartTheme = (option: any, dark: boolean): any => {
  if (!dark) return option
  const visit = (value: any, key = '', parent = ''): any => {
    if (Array.isArray(value)) return value.map(item => visit(item, key, parent))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([childKey, child]) => [childKey, visit(child, childKey, key)])
      )
    }
    if (typeof value !== 'string') return value
    if (key === 'backgroundColor' && /^(#fff(?:fff)?|white|rgba?\(\s*255)/i.test(value))
      return '#20282c'
    if (!['color', 'borderColor'].includes(key)) return value
    const short = value.match(/^#([\da-f])([\da-f])([\da-f])$/i)
    const hex = short
      ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
      : value
    if (!/^#[\da-f]{6}$/i.test(hex)) return value
    const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16))
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 45
    if (!neutral) return value
    if (key === 'borderColor' || parent === 'lineStyle') return '#435359'
    if (parent === 'itemStyle' && Math.min(r, g, b) > 220) return '#191f22'
    return Math.max(r, g, b) < 90 ? '#edf3f1' : '#b0bec1'
  }
  const themed = visit(option)
  const themeTitle = (title: any) => ({
    ...title,
    textStyle: { ...title.textStyle, color: '#edf3f1' },
    subtextStyle: { ...title.subtextStyle, color: '#b0bec1' },
  })
  return {
    ...themed,
    backgroundColor: 'transparent',
    textStyle: { color: '#b0bec1', ...themed.textStyle },
    title: themed.title
      ? Array.isArray(themed.title)
        ? themed.title.map(themeTitle)
        : themeTitle(themed.title)
      : undefined,
    legend: themed.legend
      ? {
          ...themed.legend,
          textStyle: { ...themed.legend.textStyle, color: '#b0bec1' },
        }
      : undefined,
    tooltip: themed.tooltip
      ? {
          ...themed.tooltip,
          backgroundColor: '#20282c',
          borderColor: '#435359',
          textStyle: { ...themed.tooltip.textStyle, color: '#edf3f1' },
        }
      : undefined,
  }
}
