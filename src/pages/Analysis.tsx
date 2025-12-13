import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Treemap, ScatterChart,
  Scatter, ZAxis, AreaChart, Area, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Dna, Sparkles, AlertTriangle, TrendingUp, Layers } from "lucide-react";

const COLORS = [
  'hsl(180, 100%, 50%)',
  'hsl(165, 100%, 55%)',
  'hsl(200, 100%, 60%)',
  'hsl(38, 100%, 60%)',
  'hsl(15, 100%, 65%)',
  'hsl(280, 80%, 60%)',
  'hsl(120, 70%, 50%)',
];

const tooltipStyle = {
  background: 'hsl(210, 45%, 10%)',
  border: '1px solid hsl(180, 100%, 50%, 0.2)',
  borderRadius: '8px',
  color: 'hsl(185, 100%, 95%)'
};

// Mock data for comprehensive visualization
const taxonomicTree = [
  {
    name: 'Chordata', size: 45, children: [
      { name: 'Teleostei', size: 25 },
      { name: 'Chondrichthyes', size: 12 },
      { name: 'Mammalia', size: 8 },
    ]
  },
  { name: 'Cnidaria', size: 18 },
  { name: 'Mollusca', size: 15 },
  {
    name: 'Arthropoda', size: 22, children: [
      { name: 'Crustacea', size: 14 },
      { name: 'Hexapoda', size: 8 },
    ]
  },
];

const flattenTree = (data: any[]): any[] => {
  return data.flatMap(item => {
    if (item.children) {
      return [{ name: item.name, size: item.size }, ...flattenTree(item.children)];
    }
    return [{ name: item.name, size: item.size }];
  });
};

const speciesAbundance = [
  { name: 'Thunnus albacares', abundance: 2450, reads: 12500, novelty: 0.05 },
  { name: 'Tursiops truncatus', abundance: 890, reads: 4200, novelty: 0.08 },
  { name: 'Rhincodon typus', abundance: 120, reads: 580, novelty: 0.12 },
  { name: 'Chelonia mydas', abundance: 340, reads: 1650, novelty: 0.15 },
  { name: 'Octopus vulgaris', abundance: 1200, reads: 5800, novelty: 0.07 },
  { name: 'Aurelia aurita', abundance: 3400, reads: 16000, novelty: 0.03 },
  { name: 'Penaeus monodon', abundance: 2100, reads: 9800, novelty: 0.06 },
];

const noveltyData = [
  { asv: 'ASV_0012', score: 0.82, pctIdentity: 68, clusterCohesion: 0.45, reproducibility: 0.78 },
  { asv: 'ASV_0034', score: 0.71, pctIdentity: 72, clusterCohesion: 0.52, reproducibility: 0.81 },
  { asv: 'ASV_0056', score: 0.65, pctIdentity: 75, clusterCohesion: 0.58, reproducibility: 0.73 },
  { asv: 'ASV_0078', score: 0.58, pctIdentity: 78, clusterCohesion: 0.62, reproducibility: 0.69 },
  { asv: 'ASV_0091', score: 0.45, pctIdentity: 82, clusterCohesion: 0.71, reproducibility: 0.85 },
];

const radarData = [
  { metric: 'Shannon', value: 85, fullMark: 100 },
  { metric: 'Simpson', value: 92, fullMark: 100 },
  { metric: 'Chao1', value: 78, fullMark: 100 },
  { metric: 'Evenness', value: 71, fullMark: 100 },
  { metric: 'Richness', value: 88, fullMark: 100 },
  { metric: 'Novelty', value: 45, fullMark: 100 },
];

const timeSeriesData = [
  { month: 'Jan', teleostei: 35, chondrichthyes: 12, cnidaria: 18, mollusca: 15 },
  { month: 'Feb', teleostei: 38, chondrichthyes: 14, cnidaria: 20, mollusca: 16 },
  { month: 'Mar', teleostei: 42, chondrichthyes: 15, cnidaria: 22, mollusca: 18 },
  { month: 'Apr', teleostei: 45, chondrichthyes: 18, cnidaria: 19, mollusca: 20 },
  { month: 'May', teleostei: 48, chondrichthyes: 20, cnidaria: 21, mollusca: 22 },
];

const Analysis = () => {
  const [results, setResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'species' | 'novelty' | 'temporal'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('analysis_results')
        .select('*, uploads(filename)')
        .order('created_at', { ascending: false })
        .limit(10);
      setResults(data || []);
      if (data && data.length > 0) {
        setSelectedResult(data[0]);
      }
    };
    fetchData();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'species', label: 'Species Abundance', icon: Dna },
    { id: 'novelty', label: 'Novelty Detection', icon: Sparkles },
    { id: 'temporal', label: 'Temporal Trends', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold neon-text mb-2">eDNA Analysis</h1>
        <p className="text-muted-foreground">ASV clustering, taxonomy classification & novelty detection</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === id
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total ASVs', value: '1,247', change: '+12%' },
              { label: 'Species', value: '89', change: '+5%' },
              { label: 'Novel Candidates', value: '12', change: '+3' },
              { label: 'Avg Confidence', value: '94.2%', change: '+1.2%' },
            ].map(({ label, value, change }) => (
              <div key={label} className="glass-card p-4">
                <div className="metric-value text-2xl">{value}</div>
                <div className="metric-label text-xs">{label}</div>
                <div className="text-xs text-success-green mt-1">{change}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Taxonomic Distribution */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Taxonomic Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={flattenTree(taxonomicTree).slice(0, 7)}
                    dataKey="size"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {flattenTree(taxonomicTree).slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Biodiversity Radar */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Biodiversity Metrics</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(200, 50%, 30%)" />
                  <PolarAngleAxis dataKey="metric" stroke="hsl(185, 50%, 70%)" />
                  <PolarRadiusAxis stroke="hsl(185, 50%, 70%)" />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="hsl(180, 100%, 50%)"
                    fill="hsl(180, 100%, 50%)"
                    fillOpacity={0.3}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Taxonomic Treemap */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-primary mb-4">Taxonomic Hierarchy</h3>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={flattenTree(taxonomicTree)}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="hsl(210, 50%, 6%)"
              >
                {flattenTree(taxonomicTree).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  cursor={{ stroke: 'hsl(199, 89%, 48%)', strokeWidth: 2 }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Species Abundance Tab */}
      {activeTab === 'species' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Species Abundance Bar Chart */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Species Abundance</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={speciesAbundance} layout="vertical">
                  <XAxis type="number" stroke="hsl(185, 50%, 70%)" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(185, 50%, 70%)"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'hsla(180, 100%, 50%, 0.1)' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="abundance" fill="hsl(180, 100%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Reads vs Abundance Scatter */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Reads vs Abundance</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart>
                  <XAxis
                    type="number"
                    dataKey="reads"
                    name="Reads"
                    stroke="hsl(185, 50%, 70%)"
                    label={{ value: 'Reads', position: 'bottom', fill: 'hsl(185, 50%, 70%)' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="abundance"
                    name="Abundance"
                    stroke="hsl(185, 50%, 70%)"
                    label={{ value: 'Abundance', angle: -90, position: 'left', fill: 'hsl(185, 50%, 70%)' }}
                  />
                  <ZAxis type="number" dataKey="novelty" range={[50, 400]} name="Novelty" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string) => [value, name]}
                    cursor={{ strokeDasharray: '3 3' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                  <Scatter
                    name="Species"
                    data={speciesAbundance}
                    fill="hsl(165, 100%, 55%)"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Species Table */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-primary mb-4">Species Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Species</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Abundance</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Reads</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Novelty</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-primary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {speciesAbundance.map((species, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-primary/5">
                      <td className="px-4 py-3 font-medium italic">{species.name}</td>
                      <td className="px-4 py-3">{species.abundance.toLocaleString()}</td>
                      <td className="px-4 py-3">{species.reads.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${species.novelty * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{(species.novelty * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={species.novelty > 0.1 ? 'status-warning' : 'status-active'}>
                          {species.novelty > 0.1 ? 'Review' : 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Novelty Detection Tab */}
      {activeTab === 'novelty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {noveltyData.slice(0, 3).map((item, i) => (
              <div key={item.asv} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-sm text-primary">{item.asv}</span>
                  <span className={`text-2xl font-display font-bold ${item.score > 0.7 ? 'text-destructive' : item.score > 0.5 ? 'text-warning-amber' : 'text-success-green'
                    }`}>
                    {(item.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">% Identity</span>
                    <span>{item.pctIdentity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cluster Cohesion</span>
                    <span>{(item.clusterCohesion * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reproducibility</span>
                    <span>{(item.reproducibility * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Novelty Score Distribution */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Novelty Score Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={noveltyData}>
                  <XAxis dataKey="asv" stroke="hsl(185, 50%, 70%)" />
                  <YAxis stroke="hsl(185, 50%, 70%)" domain={[0, 1]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'hsla(180, 100%, 50%, 0.1)' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {noveltyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score > 0.7 ? 'hsl(0, 85%, 60%)' : entry.score > 0.5 ? 'hsl(38, 100%, 60%)' : 'hsl(160, 100%, 45%)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Novelty Metrics Scatter */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold text-primary mb-4">Identity vs Novelty</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <XAxis
                    type="number"
                    dataKey="pctIdentity"
                    name="% Identity"
                    stroke="hsl(185, 50%, 70%)"
                    domain={[60, 100]}
                  />
                  <YAxis
                    type="number"
                    dataKey="score"
                    name="Novelty Score"
                    stroke="hsl(185, 50%, 70%)"
                    domain={[0, 1]}
                  />
                  <ZAxis type="number" dataKey="reproducibility" range={[100, 500]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ strokeDasharray: '3 3' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                  <Scatter name="ASVs" data={noveltyData}>
                    {noveltyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score > 0.7 ? 'hsl(0, 85%, 60%)' : entry.score > 0.5 ? 'hsl(38, 100%, 60%)' : 'hsl(160, 100%, 45%)'}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Novelty Candidates Alert */}
          <div className="glass-card p-6 border-l-4 border-warning-amber">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-warning-amber flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold mb-2">Novel Species Candidates Detected</h4>
                <p className="text-sm text-muted-foreground">
                  {noveltyData.filter(d => d.score > 0.5).length} ASVs show significant novelty scores (&gt;50%).
                  These sequences may represent undocumented species or significant genetic variants.
                  Recommend BLAST verification and phylogenetic analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporal Trends Tab */}
      {activeTab === 'temporal' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-primary mb-4">Taxonomic Abundance Over Time</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  {['teleostei', 'chondrichthyes', 'cnidaria', 'mollusca'].map((key, i) => (
                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" stroke="hsl(185, 50%, 70%)" />
                <YAxis stroke="hsl(185, 50%, 70%)" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                />
                <Legend />
                <Area type="monotone" dataKey="teleostei" stackId="1" stroke={COLORS[0]} fill={`url(#gradient-teleostei)`} name="Teleostei" />
                <Area type="monotone" dataKey="chondrichthyes" stackId="1" stroke={COLORS[1]} fill={`url(#gradient-chondrichthyes)`} name="Chondrichthyes" />
                <Area type="monotone" dataKey="cnidaria" stackId="1" stroke={COLORS[2]} fill={`url(#gradient-cnidaria)`} name="Cnidaria" />
                <Area type="monotone" dataKey="mollusca" stackId="1" stroke={COLORS[3]} fill={`url(#gradient-mollusca)`} name="Mollusca" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['teleostei', 'chondrichthyes', 'cnidaria', 'mollusca'].map((taxon, i) => {
              const latest = timeSeriesData[timeSeriesData.length - 1][taxon as keyof typeof timeSeriesData[0]] as number;
              const previous = timeSeriesData[timeSeriesData.length - 2][taxon as keyof typeof timeSeriesData[0]] as number;
              const change = ((latest - previous) / previous * 100).toFixed(1);
              return (
                <div key={taxon} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="capitalize font-medium">{taxon}</span>
                  </div>
                  <div className="text-2xl font-display font-bold text-foreground">{latest}</div>
                  <div className={`text-xs ${Number(change) >= 0 ? 'text-success-green' : 'text-destructive'}`}>
                    {Number(change) >= 0 ? '+' : ''}{change}% vs last month
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Results */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-primary mb-4">Recent Analysis Results</h3>
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                className={`p-4 rounded-lg flex justify-between items-center cursor-pointer transition-colors ${selectedResult?.id === r.id ? 'bg-primary/20 border border-primary/50' : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                onClick={() => setSelectedResult(r)}
              >
                <div>
                  <span className="font-medium">{r.uploads?.filename || 'Unknown'}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString()} • {r.summary?.slice(0, 60)}...
                  </p>
                </div>
                <span className="status-active">Completed</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No analysis results yet. Upload a FASTQ file to begin.</p>
        )}
      </div>
    </div>
  );
};

export default Analysis;
