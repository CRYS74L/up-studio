import * as echarts from 'echarts/core';
import { MapChart, BarChart, CustomChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { VisualMapComponent, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([MapChart, BarChart, CustomChart, LineChart, PieChart, ScatterChart, VisualMapComponent, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, LegendComponent, CanvasRenderer]);
export { echarts };
