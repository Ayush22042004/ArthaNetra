import { afterEach, describe, expect, it, vi } from 'vitest'
import { isThemePreference, readThemePreference, resolveTheme } from './theme'
import { withChartTheme } from './chartTheme'

afterEach(() => vi.unstubAllGlobals())

describe('appearance preferences', () => {
  it('defaults to light for a first visit', () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(readThemePreference()).toBe('light')
  })

  it('follows the operating system only in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('rejects malformed saved preferences', () => {
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference(null)).toBe(false)
    vi.stubGlobal('localStorage', { getItem: () => 'unexpected-value' })
    expect(readThemePreference()).toBe('light')
  })

  it('remains usable with browser storage disabled', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Storage disabled')
      },
    })
    expect(readThemePreference()).toBe('light')
  })
})

describe('chart appearance', () => {
  it('keeps original options and formatter functions intact', () => {
    const formatter = (value: number) => `${value}%`
    const original = {
      title: { text: 'Utilization' },
      series: [{ label: { color: '#333', formatter }, itemStyle: { color: '#ef4444' } }],
    }
    const themed = withChartTheme(original, true)
    expect(themed.title.textStyle.color).toBe('#edf3f1')
    expect(themed.series[0].label.color).toBe('#edf3f1')
    expect(themed.series[0].label.formatter).toBe(formatter)
    expect(themed.series[0].itemStyle.color).toBe('#ef4444')
    expect(original.series[0].label.color).toBe('#333')
  })

  it('preserves light mode and gives dark tooltips readable surfaces', () => {
    const original = { tooltip: { trigger: 'axis', textStyle: { color: '#333' } } }
    expect(withChartTheme(original, false)).toBe(original)
    expect(withChartTheme(original, true).tooltip).toMatchObject({
      trigger: 'axis',
      backgroundColor: '#20282c',
      textStyle: { color: '#edf3f1' },
    })
  })
})
