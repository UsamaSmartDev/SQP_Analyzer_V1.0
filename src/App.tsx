import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Upload, FileText, BarChart3, Table as TableIcon, Download, 
  Search, Filter, ArrowUpDown, Info, AlertCircle, CheckCircle2,
  TrendingUp, ShoppingCart, MousePointer2, Eye, ChevronRight,
  LayoutDashboard, Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface SQPData {
  query: string;
  volume: number;
  impressions: number;
  brandImpressions: number;
  brandImpressionShare: number;
  clicks: number;
  brandClicks: number;
  brandClickShare: number;
  cartAdds: number;
  brandCartAdds: number;
  brandCartAddShare: number;
  purchases: number;
  brandPurchases: number;
  brandPurchaseShare: number;
  ctr: number;
  cvr: number;
  [key: string]: any;
}

interface Dataset {
  id: string;
  name: string;
  data: SQPData[];
  summary: SummaryStats;
}

interface SummaryStats {
  totalQueries: number;
  totalVolume: number;
  avgBrandImpressionShare: number;
  avgBrandClickShare: number;
  avgBrandPurchaseShare: number;
  totalBrandPurchases: number;
}

// --- Constants ---

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Sample Data ---

const SAMPLE_DATA: SQPData[] = [
  { query: 'organic coffee beans', volume: 12500, impressions: 45000, brandImpressions: 4500, brandImpressionShare: 10.0, clicks: 1200, brandClicks: 150, brandClickShare: 12.5, cartAdds: 450, brandCartAdds: 60, brandCartAddShare: 13.3, purchases: 120, brandPurchases: 25, brandPurchaseShare: 20.8, ctr: 2.67, cvr: 10.0 },
  { query: 'dark roast coffee', volume: 8200, impressions: 32000, brandImpressions: 2800, brandImpressionShare: 8.75, clicks: 950, brandClicks: 110, brandClickShare: 11.5, cartAdds: 320, brandCartAdds: 40, brandCartAddShare: 12.5, purchases: 85, brandPurchases: 12, brandPurchaseShare: 14.1, ctr: 2.97, cvr: 8.95 },
  { query: 'whole bean coffee', volume: 15000, impressions: 58000, brandImpressions: 6200, brandImpressionShare: 10.7, clicks: 1800, brandClicks: 240, brandClickShare: 13.3, cartAdds: 680, brandCartAdds: 95, brandCartAddShare: 14.0, purchases: 180, brandPurchases: 35, brandPurchaseShare: 19.4, ctr: 3.10, cvr: 10.0 },
];

// --- Components ---

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'comparison'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SQPData; direction: 'asc' | 'desc' } | null>(null);

  const parseFile = (file: File): Promise<Dataset> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        
        // Extract metadata for naming
        const firstLine = text.split('\n')[0];
        const weekMatch = firstLine.match(/Select week=\["(.*?)"\]/);
        const monthMatch = firstLine.match(/Select month=\["(.*?)"\]/);
        const rangeMatch = firstLine.match(/Reporting Range=\["(.*?)"\]/);
        
        let datasetName = file.name;
        if (weekMatch) datasetName = weekMatch[1].split('|')[0].trim();
        else if (monthMatch) datasetName = monthMatch[1];
        else if (rangeMatch) datasetName = `${rangeMatch[1]} Report`;

        const headerIndex = text.indexOf('"Search Query"');
        const cleanText = headerIndex !== -1 ? text.substring(headerIndex) : text;

        Papa.parse(cleanText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const data = results.data.map((row: any) => {
                const getVal = (keys: string[]) => {
                  for (const key of keys) {
                    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
                  }
                  return 0;
                };

                const query = row['Search Query'] || row['search_query'] || '';
                const volume = parseFloat(String(getVal(['Search Query Volume', 'search_query_volume'])).replace(/,/g, '')) || 0;
                const impressions = parseFloat(String(getVal(['Impressions: Total Count', 'impressions_total_count'])).replace(/,/g, '')) || 0;
                const brandImpressions = parseFloat(String(getVal(['Impressions: Brand Count', 'Impressions: ASIN Count', 'impressions_brand_count'])).replace(/,/g, '')) || 0;
                const brandImpressionShare = parseFloat(String(getVal(['Impressions: Brand Share', 'Impressions: ASIN Share %', 'impressions_brand_share'])).replace(/%/g, '')) || 0;
                const clicks = parseFloat(String(getVal(['Clicks: Total Count', 'clicks_total_count'])).replace(/,/g, '')) || 0;
                const brandClicks = parseFloat(String(getVal(['Clicks: Brand Count', 'Clicks: ASIN Count', 'clicks_brand_count'])).replace(/,/g, '')) || 0;
                const brandClickShare = parseFloat(String(getVal(['Clicks: Brand Share', 'Clicks: ASIN Share %', 'clicks_brand_share'])).replace(/%/g, '')) || 0;
                const cartAdds = parseFloat(String(getVal(['Cart Adds: Total Count', 'cart_adds_total_count'])).replace(/,/g, '')) || 0;
                const brandCartAdds = parseFloat(String(getVal(['Cart Adds: Brand Count', 'Cart Adds: ASIN Count', 'cart_adds_brand_count'])).replace(/,/g, '')) || 0;
                const brandCartAddShare = parseFloat(String(getVal(['Cart Adds: Brand Share', 'Cart Adds: ASIN Share %', 'cart_adds_brand_share'])).replace(/%/g, '')) || 0;
                const purchases = parseFloat(String(getVal(['Purchases: Total Count', 'purchases_total_count'])).replace(/,/g, '')) || 0;
                const brandPurchases = parseFloat(String(getVal(['Purchases: Brand Count', 'Purchases: ASIN Count', 'purchases_brand_count'])).replace(/,/g, '')) || 0;
                const brandPurchaseShare = parseFloat(String(getVal(['Purchases: Brand Share', 'Purchases: ASIN Share %', 'purchases_brand_share'])).replace(/%/g, '')) || 0;

                return {
                  query,
                  volume,
                  impressions,
                  brandImpressions,
                  brandImpressionShare,
                  clicks,
                  brandClicks,
                  brandClickShare,
                  cartAdds,
                  brandCartAdds,
                  brandCartAddShare,
                  purchases,
                  brandPurchases,
                  brandPurchaseShare,
                  ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                  cvr: clicks > 0 ? (purchases / clicks) * 100 : 0,
                };
              }).filter(item => item.query);

              if (data.length === 0) throw new Error("No valid data");

              const summary: SummaryStats = {
                totalQueries: data.length,
                totalVolume: data.reduce((acc, curr) => acc + curr.volume, 0),
                avgBrandImpressionShare: data.reduce((acc, curr) => acc + curr.brandImpressionShare, 0) / data.length,
                avgBrandClickShare: data.reduce((acc, curr) => acc + curr.brandClickShare, 0) / data.length,
                avgBrandPurchaseShare: data.reduce((acc, curr) => acc + curr.brandPurchaseShare, 0) / data.length,
                totalBrandPurchases: data.reduce((acc, curr) => acc + curr.brandPurchases, 0),
              };

              resolve({ id: Math.random().toString(36).substr(2, 9), name: datasetName, data, summary });
            } catch (err) {
              reject(err);
            }
          },
          error: reject
        });
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const newDatasets = await Promise.all(Array.from(files).map(parseFile));
      setDatasets(prev => [...prev, ...newDatasets].sort((a, b) => a.name.localeCompare(b.name)));
      if (newDatasets.length > 1 || datasets.length > 0) setActiveTab('comparison');
      setLoading(false);
    } catch (err: any) {
      setError("Failed to parse one or more files. Ensure they are Amazon SQP CSVs.");
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const summary: SummaryStats = {
      totalQueries: SAMPLE_DATA.length,
      totalVolume: SAMPLE_DATA.reduce((acc, curr) => acc + curr.volume, 0),
      avgBrandImpressionShare: SAMPLE_DATA.reduce((acc, curr) => acc + curr.brandImpressionShare, 0) / SAMPLE_DATA.length,
      avgBrandClickShare: SAMPLE_DATA.reduce((acc, curr) => acc + curr.brandClickShare, 0) / SAMPLE_DATA.length,
      avgBrandPurchaseShare: SAMPLE_DATA.reduce((acc, curr) => acc + curr.brandPurchaseShare, 0) / SAMPLE_DATA.length,
      totalBrandPurchases: SAMPLE_DATA.reduce((acc, curr) => acc + curr.brandPurchases, 0),
    };
    setDatasets([{ id: 'sample', name: 'Sample Period', data: SAMPLE_DATA, summary }]);
    setError(null);
  };

  const activeDataset = datasets[datasets.length - 1];
  const data = activeDataset?.data || [];
  const summaryStats = activeDataset?.summary || { totalQueries: 0, totalVolume: 0, avgBrandImpressionShare: 0, avgBrandClickShare: 0, avgBrandPurchaseShare: 0, totalBrandPurchases: 0 };

  const comparisonData = useMemo(() => {
    if (datasets.length < 2) return null;
    const current = datasets[datasets.length - 1];
    const previous = datasets[datasets.length - 2];

    const metrics = [
      { label: 'Search Volume', key: 'totalVolume', current: current.summary.totalVolume, previous: previous.summary.totalVolume },
      { label: 'Impression Share', key: 'avgBrandImpressionShare', current: current.summary.avgBrandImpressionShare, previous: previous.summary.avgBrandImpressionShare, unit: '%' },
      { label: 'Purchase Share', key: 'avgBrandPurchaseShare', current: current.summary.avgBrandPurchaseShare, previous: previous.summary.avgBrandPurchaseShare, unit: '%' },
      { label: 'Brand Purchases', key: 'totalBrandPurchases', current: current.summary.totalBrandPurchases, previous: previous.summary.totalBrandPurchases },
    ];

    return {
      periods: { current: current.name, previous: previous.name },
      metrics: metrics.map(m => ({
        ...m,
        delta: m.current - m.previous,
        percentChange: m.previous !== 0 ? ((m.current - m.previous) / m.previous) * 100 : 0
      }))
    };
  }, [datasets]);

  const filteredData = useMemo(() => {
    let result = data.filter(item => 
      item.query.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig]);

  const requestSort = (key: keyof SQPData) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const topQueriesByVolume = useMemo(() => {
    return [...data].sort((a, b) => b.volume - a.volume).slice(0, 10);
  }, [data]);

  const shareTrendData = useMemo(() => {
    return topQueriesByVolume.map(item => ({
      name: item.query.length > 15 ? item.query.substring(0, 15) + '...' : item.query,
      'Impression Share': item.brandImpressionShare,
      'Click Share': item.brandClickShare,
      'Purchase Share': item.brandPurchaseShare,
    }));
  }, [topQueriesByVolume]);

  if (datasets.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">Amazon SQP Analyzer</h1>
            <p className="text-gray-500 text-lg max-w-md">
              Upload one or more Search Query Performance reports to compare WoW/MoM performance.
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 transition-all group-hover:border-emerald-400 group-hover:bg-emerald-50/30 flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 group-hover:text-emerald-500 mb-4 transition-colors" />
                <p className="text-gray-600 font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-gray-400 text-sm">CSV files only (Upload multiple for comparison)</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <span className="text-gray-400 text-sm font-medium">OR</span>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <button
              onClick={loadSampleData}
              className="w-full py-4 px-6 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
            >
              <FileText className="w-5 h-5" />
              Try with Sample Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
      {/* Sidebar / Navigation */}
      <div className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-white border-r border-gray-100 z-50 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl hidden md:block tracking-tight">SQP Analyzer</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'dashboard' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden md:block">Dashboard</span>
          </button>
          {datasets.length > 1 && (
            <button
              onClick={() => setActiveTab('comparison')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === 'comparison' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="hidden md:block">Comparison (WoW/MoM)</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('table')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'table' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <TableIcon className="w-5 h-5" />
            <span className="hidden md:block">Data Explorer</span>
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <div className="mb-4 px-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Active Periods</p>
            <div className="space-y-1">
              {datasets.map(ds => (
                <div key={ds.id} className="text-xs font-medium text-gray-600 truncate flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  {ds.name}
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setDatasets([])}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden md:block">Reset All</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 min-h-screen">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'dashboard' ? 'Market Overview' : activeTab === 'comparison' ? 'Period Comparison' : 'Search Query Database'}
            </h2>
            <div className="h-6 w-px bg-gray-200"></div>
            <p className="text-sm text-gray-500 font-medium">
              {activeDataset?.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 w-64 transition-all"
              />
            </div>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                <Upload className="w-4 h-4" />
                Add Period
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'comparison' && comparisonData ? (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Performance Delta</h3>
                    <p className="text-sm text-gray-500">Comparing {comparisonData.periods.current} vs {comparisonData.periods.previous}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {comparisonData.metrics.map((m, idx) => (
                    <div key={idx} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{m.label}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900">{m.current.toLocaleString()}{m.unit}</h4>
                          <p className="text-xs text-gray-400">Prev: {m.previous.toLocaleString()}{m.unit}</p>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                          m.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {m.delta >= 0 ? '+' : ''}{m.percentChange.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-8">Metric Comparison Chart</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datasets} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Bar dataKey="summary.totalVolume" name="Search Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="summary.totalBrandPurchases" name="Purchases" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total Search Volume" 
                  value={summaryStats.totalVolume.toLocaleString()} 
                  icon={<Eye className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard 
                  title="Avg Impression Share" 
                  value={`${summaryStats.avgBrandImpressionShare.toFixed(1)}%`} 
                  icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
                  color="emerald"
                />
                <StatCard 
                  title="Avg Purchase Share" 
                  value={`${summaryStats.avgBrandPurchaseShare.toFixed(1)}%`} 
                  icon={<ShoppingCart className="w-5 h-5 text-amber-600" />}
                  color="amber"
                />
                <StatCard 
                  title="Brand Purchases" 
                  value={summaryStats.totalBrandPurchases.toLocaleString()} 
                  icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />}
                  color="purple"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Share Performance by Query</h3>
                      <p className="text-sm text-gray-500">Top 10 queries by search volume</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-medium text-gray-500">Impression</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs font-medium text-gray-500">Click</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-xs font-medium text-gray-500">Purchase</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shareTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          interval={0}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          unit="%"
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="Impression Share" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Click Share" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Purchase Share" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Market Share Distribution</h3>
                  <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'High Share (>15%)', value: data.filter(d => d.brandImpressionShare > 15).length },
                            { name: 'Mid Share (5-15%)', value: data.filter(d => d.brandImpressionShare >= 5 && d.brandImpressionShare <= 15).length },
                            { name: 'Low Share (<5%)', value: data.filter(d => d.brandImpressionShare < 5).length },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {COLORS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-gray-900">{data.length}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Queries</span>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <LegendItem color={COLORS[0]} label="High Share" count={data.filter(d => d.brandImpressionShare > 15).length} />
                    <LegendItem color={COLORS[1]} label="Mid Share" count={data.filter(d => d.brandImpressionShare >= 5 && d.brandImpressionShare <= 15).length} />
                    <LegendItem color={COLORS[2]} label="Low Share" count={data.filter(d => d.brandImpressionShare < 5).length} />
                  </div>
                </div>
              </div>

              {/* Top Opportunities */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Growth Opportunities</h3>
                    <p className="text-sm text-gray-500">High volume queries with low brand share</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('table')}
                    className="text-emerald-600 text-sm font-bold hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data
                    .filter(d => d.brandImpressionShare < 10 && d.volume > summaryStats.totalVolume / data.length)
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <div key={idx} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Opportunity</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{item.query}</h4>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs text-gray-500">Volume: <span className="font-bold text-gray-700">{item.volume.toLocaleString()}</span></span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Current Share</span>
                            <span className="font-bold text-gray-900">{item.brandImpressionShare.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${item.brandImpressionShare}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('query')}>
                        <div className="flex items-center gap-2">Search Query <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('volume')}>
                        <div className="flex items-center gap-2">Volume <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandImpressionShare')}>
                        <div className="flex items-center gap-2">Imp. Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandClickShare')}>
                        <div className="flex items-center gap-2">Click Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandPurchaseShare')}>
                        <div className="flex items-center gap-2">Purch. Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('ctr')}>
                        <div className="flex items-center gap-2">CTR <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="p-5 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('cvr')}>
                        <div className="flex items-center gap-2">CVR <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 font-bold text-gray-900">{item.query}</td>
                        <td className="p-5 text-gray-600 font-medium">{item.volume.toLocaleString()}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(item.brandImpressionShare, 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item.brandImpressionShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.min(item.brandClickShare, 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item.brandClickShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${Math.min(item.brandPurchaseShare, 100)}%` }}></div>
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item.brandPurchaseShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-5 text-sm font-medium text-gray-600">{item.ctr.toFixed(2)}%</td>
                        <td className="p-5 text-sm font-medium text-gray-600">{item.cvr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", colorClasses[color])}>
          {icon}
        </div>
        <Info className="w-4 h-4 text-gray-300 cursor-help" />
      </div>
      <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h4>
    </div>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-700">{count}</span>
    </div>
  );
}
