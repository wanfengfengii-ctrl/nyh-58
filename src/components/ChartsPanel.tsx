import React from 'react';
import {
  Paper,
  Title,
  Tabs,
  Text,
} from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import type { BuoyancyResult, StabilityResult, Cargo, RaftConfig } from '../types';

interface ChartsPanelProps {
  buoyancy: BuoyancyResult;
  stability: StabilityResult;
  cargos: Cargo[];
  config: RaftConfig;
}

export const ChartsPanel: React.FC<ChartsPanelProps> = ({
  buoyancy,
  stability,
  cargos,
  config,
}) => {
  const weightDistributionData = [
    { name: '左侧', weight: stability.leftWeight, fill: '#3498db' },
    { name: '右侧', weight: stability.rightWeight, fill: '#e74c3c' },
  ];

  const radarData = [
    { subject: '浮力余量', A: Math.max(0, 100 - buoyancy.loadRatio * 100), fullMark: 100 },
    { subject: '稳定性', A: stability.stabilityScore, fullMark: 100 },
    { subject: '左右平衡', A: 100 - Math.abs(stability.leftRightBalance) * 200, fullMark: 100 },
    { subject: '安全储备', A: buoyancy.isOverloaded ? 0 : (1 - buoyancy.loadRatio) * 100 + 20, fullMark: 100 },
    { subject: '抗流能力', A: Math.max(0, 100 - config.waterFlowSpeed * 15), fullMark: 100 },
  ];

  const cargoPieData = cargos.map((cargo) => ({
    name: cargo.name,
    value: cargo.weight,
    color: cargo.color,
  }));

  const loadHistoryData = [
    { name: '空筏', load: 0, buoyancy: buoyancy.totalBuoyancy },
    { name: '竹筏自重', load: buoyancy.totalWeight - cargos.reduce((s, c) => s + c.weight, 0), buoyancy: buoyancy.totalBuoyancy },
    { name: '当前载重', load: buoyancy.totalWeight, buoyancy: buoyancy.totalBuoyancy },
  ];

  return (
    <Paper p="md" shadow="sm" radius="md">
      <Title order={4} mb="md">
        数据分析图表
      </Title>
      <Tabs defaultValue="distribution">
        <Tabs.List mb="md">
          <Tabs.Tab value="distribution">重量分布</Tabs.Tab>
          <Tabs.Tab value="radar">综合评估</Tabs.Tab>
          <Tabs.Tab value="cargo">货物占比</Tabs.Tab>
          <Tabs.Tab value="load">载重曲线</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="distribution" pt="xs">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weightDistributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} N`, '重量']} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {weightDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Text size="sm" c="dimmed" ta="center" mt="sm">
            左右两侧重量分布对比
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="radar" pt="xs">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="评分"
                  dataKey="A"
                  stroke="#228be6"
                  fill="#228be6"
                  fillOpacity={0.5}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <Text size="sm" c="dimmed" ta="center" mt="sm">
            竹筏综合性能雷达图
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="cargo" pt="xs">
          {cargos.length === 0 ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text c="dimmed">暂无货物数据</Text>
            </div>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cargoPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {cargoPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} N`, '重量']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <Text size="sm" c="dimmed" ta="center" mt="sm">
            各货物重量占比
          </Text>
        </Tabs.Panel>

        <Tabs.Panel value="load" pt="xs">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} N`, '']} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="buoyancy"
                  stroke="#2ecc71"
                  fill="#2ecc71"
                  fillOpacity={0.3}
                  name="浮力上限"
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke="#e74c3c"
                  fill="#e74c3c"
                  fillOpacity={0.5}
                  name="实际载重"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Text size="sm" c="dimmed" ta="center" mt="sm">
            载重与浮力对比
          </Text>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};
