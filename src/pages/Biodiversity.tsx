import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const indices = [
  { name: "Shannon Index", value: "3.42", change: "+0.12" },
  { name: "Simpson Index", value: "0.89", change: "+0.03" },
  { name: "Chao1 Estimator", value: "287", change: "+15" },
  { name: "Evenness", value: "0.76", change: "-0.02" },
];

const timeData = [
  { month: 'Jan', shannon: 3.1, simpson: 0.82 },
  { month: 'Feb', shannon: 3.2, simpson: 0.84 },
  { month: 'Mar', shannon: 3.3, simpson: 0.86 },
  { month: 'Apr', shannon: 3.35, simpson: 0.87 },
  { month: 'May', shannon: 3.42, simpson: 0.89 },
];

const Biodiversity = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold neon-text mb-2">Biodiversity Metrics</h1>
        <p className="text-muted-foreground">Ecological indices and species richness analysis</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {indices.map(({ name, value, change }) => (
          <div key={name} className="glass-card p-6 text-center">
            <div className="metric-value">{value}</div>
            <div className="metric-label">{name}</div>
            <div className={`text-sm mt-2 ${change.startsWith('+') ? 'text-success-green' : 'text-destructive'}`}>
              {change} from last month
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-primary mb-4">Diversity Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeData}>
            <defs>
              <linearGradient id="shannonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="hsl(185, 50%, 70%)" />
            <YAxis stroke="hsl(185, 50%, 70%)" />
            <Tooltip contentStyle={{ background: 'hsl(210, 45%, 10%)', border: '1px solid hsl(180, 100%, 50%, 0.2)' }} />
            <Area type="monotone" dataKey="shannon" stroke="hsl(180, 100%, 50%)" fill="url(#shannonGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Biodiversity;
