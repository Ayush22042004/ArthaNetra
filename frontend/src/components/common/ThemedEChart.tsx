import { useMemo, type ComponentProps } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../../contexts/ThemeContext'
import { withChartTheme } from '../../utils/chartTheme'

const ThemedEChart = ({ option, ...props }: ComponentProps<typeof ReactECharts>) => {
  const { theme } = useTheme()
  const themedOption = useMemo(() => withChartTheme(option, theme === 'dark'), [option, theme])
  return <ReactECharts {...props} option={themedOption} />
}

export default ThemedEChart
