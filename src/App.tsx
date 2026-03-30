import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
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
  type: 'branded' | 'generic';
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
  totalImpressions: number;
  totalBrandImpressions: number;
  avgBrandImpressionShare: number;
  totalClicks: number;
  totalBrandClicks: number;
  avgBrandClickShare: number;
  totalCartAdds: number;
  totalBrandCartAdds: number;
  avgBrandCartAddShare: number;
  totalPurchases: number;
  totalBrandPurchases: number;
  avgBrandPurchaseShare: number;
  avgCtr: number;
  avgCvr: number;
}

// --- Constants ---

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Sample Data ---

const SAMPLE_DATA: SQPData[] = [
  { query: 'organic coffee beans', volume: 12500, impressions: 45000, brandImpressions: 4500, brandImpressionShare: 10.0, clicks: 1200, brandClicks: 150, brandClickShare: 12.5, cartAdds: 450, brandCartAdds: 60, brandCartAddShare: 13.3, purchases: 120, brandPurchases: 25, brandPurchaseShare: 20.8, ctr: 2.67, cvr: 10.0, type: 'generic' },
  { query: 'dark roast coffee', volume: 8200, impressions: 32000, brandImpressions: 2800, brandImpressionShare: 8.75, clicks: 950, brandClicks: 110, brandClickShare: 11.5, cartAdds: 320, brandCartAdds: 40, brandCartAddShare: 12.5, purchases: 85, brandPurchases: 12, brandPurchaseShare: 14.1, ctr: 2.97, cvr: 8.95, type: 'generic' },
  { query: 'whole bean coffee', volume: 15000, impressions: 58000, brandImpressions: 6200, brandImpressionShare: 10.7, clicks: 1800, brandClicks: 240, brandClickShare: 13.3, cartAdds: 680, brandCartAdds: 95, brandCartAddShare: 14.0, purchases: 180, brandPurchases: 35, brandPurchaseShare: 19.4, ctr: 3.10, cvr: 10.0, type: 'generic' },
];

// --- Components ---

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [brandName, setBrandName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'comparison' | 'funnel' | 'keywords'>('dashboard');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [comparisonPeriodIds, setComparisonPeriodIds] = useState<{ current: string | null; previous: string | null }>({ current: null, previous: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SQPData; direction: 'asc' | 'desc' } | null>(null);
  const [dashboardMetric, setDashboardMetric] = useState<keyof SQPData>('brandImpressionShare');

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
                  type: brandName && query.toLowerCase().includes(brandName.toLowerCase()) ? 'branded' : 'generic'
                };
              }).filter(item => item.query);

              if (data.length === 0) throw new Error("No valid data");

              const summary: SummaryStats = {
                totalQueries: data.length,
                totalVolume: data.reduce((acc, curr) => acc + curr.volume, 0),
                totalImpressions: data.reduce((acc, curr) => acc + curr.impressions, 0),
                totalBrandImpressions: data.reduce((acc, curr) => acc + curr.brandImpressions, 0),
                avgBrandImpressionShare: data.reduce((acc, curr) => acc + curr.brandImpressionShare, 0) / data.length,
                totalClicks: data.reduce((acc, curr) => acc + curr.clicks, 0),
                totalBrandClicks: data.reduce((acc, curr) => acc + curr.brandClicks, 0),
                avgBrandClickShare: data.reduce((acc, curr) => acc + curr.brandClickShare, 0) / data.length,
                totalCartAdds: data.reduce((acc, curr) => acc + curr.cartAdds, 0),
                totalBrandCartAdds: data.reduce((acc, curr) => acc + curr.brandCartAdds, 0),
                avgBrandCartAddShare: data.reduce((acc, curr) => acc + curr.brandCartAddShare, 0) / data.length,
                totalPurchases: data.reduce((acc, curr) => acc + curr.purchases, 0),
                totalBrandPurchases: data.reduce((acc, curr) => acc + curr.brandPurchases, 0),
                avgBrandPurchaseShare: data.reduce((acc, curr) => acc + curr.brandPurchaseShare, 0) / data.length,
                avgCtr: data.reduce((acc, curr) => acc + curr.ctr, 0) / data.length,
                avgCvr: data.reduce((acc, curr) => acc + curr.cvr, 0) / data.length,
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
      setDatasets(prev => {
        const updated = [...prev, ...newDatasets].sort((a, b) => a.name.localeCompare(b.name));
        if (updated.length > 0) {
          setSelectedPeriodId(updated[updated.length - 1].id);
          if (updated.length >= 2) {
            setComparisonPeriodIds({
              current: updated[updated.length - 1].id,
              previous: updated[updated.length - 2].id
            });
          }
        }
        return updated;
      });
      if (newDatasets.length > 1 || datasets.length > 0) setActiveTab('comparison');
      setLoading(false);
    } catch (err: any) {
      setError("Failed to parse one or more files. Ensure they are Amazon SQP CSVs.");
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const dataWithType = SAMPLE_DATA.map(d => ({
      ...d,
      type: brandName && d.query.toLowerCase().includes(brandName.toLowerCase()) ? 'branded' : 'generic'
    })) as SQPData[];

    const summary: SummaryStats = {
      totalQueries: dataWithType.length,
      totalVolume: dataWithType.reduce((acc, curr) => acc + curr.volume, 0),
      totalImpressions: dataWithType.reduce((acc, curr) => acc + curr.impressions, 0),
      totalBrandImpressions: dataWithType.reduce((acc, curr) => acc + curr.brandImpressions, 0),
      avgBrandImpressionShare: dataWithType.reduce((acc, curr) => acc + curr.brandImpressionShare, 0) / dataWithType.length,
      totalClicks: dataWithType.reduce((acc, curr) => acc + curr.clicks, 0),
      totalBrandClicks: dataWithType.reduce((acc, curr) => acc + curr.brandClicks, 0),
      avgBrandClickShare: dataWithType.reduce((acc, curr) => acc + curr.brandClickShare, 0) / dataWithType.length,
      totalCartAdds: dataWithType.reduce((acc, curr) => acc + curr.cartAdds, 0),
      totalBrandCartAdds: dataWithType.reduce((acc, curr) => acc + curr.brandCartAdds, 0),
      avgBrandCartAddShare: dataWithType.reduce((acc, curr) => acc + curr.brandCartAddShare, 0) / dataWithType.length,
      totalPurchases: dataWithType.reduce((acc, curr) => acc + curr.purchases, 0),
      totalBrandPurchases: dataWithType.reduce((acc, curr) => acc + curr.brandPurchases, 0),
      avgBrandPurchaseShare: dataWithType.reduce((acc, curr) => acc + curr.brandPurchaseShare, 0) / dataWithType.length,
      avgCtr: dataWithType.reduce((acc, curr) => acc + curr.ctr, 0) / dataWithType.length,
      avgCvr: dataWithType.reduce((acc, curr) => acc + curr.cvr, 0) / dataWithType.length,
    };
    const newDataset: Dataset = { id: 'sample', name: 'Sample Period', data: dataWithType, summary };
    setDatasets([newDataset]);
    setSelectedPeriodId(newDataset.id);
    setError(null);
  };

  const activeDataset = useMemo(() => {
    if (!selectedPeriodId) return datasets[datasets.length - 1];
    return datasets.find(d => d.id === selectedPeriodId) || datasets[datasets.length - 1];
  }, [datasets, selectedPeriodId]);

  const data = activeDataset?.data || [];
  const summaryStats = activeDataset?.summary || { 
    totalQueries: 0, totalVolume: 0, totalImpressions: 0, totalBrandImpressions: 0,
    avgBrandImpressionShare: 0, totalClicks: 0, totalBrandClicks: 0, avgBrandClickShare: 0,
    totalCartAdds: 0, totalBrandCartAdds: 0, avgBrandCartAddShare: 0, totalPurchases: 0,
    totalBrandPurchases: 0, avgBrandPurchaseShare: 0, avgCtr: 0, avgCvr: 0 
  };

  const comparisonData = useMemo(() => {
    if (datasets.length < 2) return null;
    
    let current = datasets.find(d => d.id === comparisonPeriodIds.current);
    let previous = datasets.find(d => d.id === comparisonPeriodIds.previous);

    if (!current || !previous) {
      current = datasets[datasets.length - 1];
      previous = datasets[datasets.length - 2];
    }

    const metrics = [
      { label: 'Search Volume', key: 'totalVolume', current: current.summary.totalVolume, previous: previous.summary.totalVolume },
      { label: 'Total Impressions', key: 'totalImpressions', current: current.summary.totalImpressions, previous: previous.summary.totalImpressions },
      { label: 'Brand Impressions', key: 'totalBrandImpressions', current: current.summary.totalBrandImpressions, previous: previous.summary.totalBrandImpressions },
      { label: 'Impression Share', key: 'avgBrandImpressionShare', current: current.summary.avgBrandImpressionShare, previous: previous.summary.avgBrandImpressionShare, unit: '%' },
      { label: 'Total Clicks', key: 'totalClicks', current: current.summary.totalClicks, previous: previous.summary.totalClicks },
      { label: 'Brand Clicks', key: 'totalBrandClicks', current: current.summary.totalBrandClicks, previous: previous.summary.totalBrandClicks },
      { label: 'Click Share', key: 'avgBrandClickShare', current: current.summary.avgBrandClickShare, previous: previous.summary.avgBrandClickShare, unit: '%' },
      { label: 'Total Cart Adds', key: 'totalCartAdds', current: current.summary.totalCartAdds, previous: previous.summary.totalCartAdds },
      { label: 'Brand Cart Adds', key: 'totalBrandCartAdds', current: current.summary.totalBrandCartAdds, previous: previous.summary.totalBrandCartAdds },
      { label: 'Cart Add Share', key: 'avgBrandCartAddShare', current: current.summary.avgBrandCartAddShare, previous: previous.summary.avgBrandCartAddShare, unit: '%' },
      { label: 'Total Purchases', key: 'totalPurchases', current: current.summary.totalPurchases, previous: previous.summary.totalPurchases },
      { label: 'Brand Purchases', key: 'totalBrandPurchases', current: current.summary.totalBrandPurchases, previous: previous.summary.totalBrandPurchases },
      { label: 'Purchase Share', key: 'avgBrandPurchaseShare', current: current.summary.avgBrandPurchaseShare, previous: previous.summary.avgBrandPurchaseShare, unit: '%' },
      { label: 'Brand CTR', key: 'avgCtr', current: current.summary.avgCtr, previous: previous.summary.avgCtr, unit: '%' },
      { label: 'Brand CVR', key: 'avgCvr', current: current.summary.avgCvr, previous: previous.summary.avgCvr, unit: '%' },
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

  const funnelData = useMemo(() => {
    if (data.length === 0) return [];
    
    const total = {
      impressions: data.reduce((acc, curr) => acc + curr.impressions, 0),
      clicks: data.reduce((acc, curr) => acc + curr.clicks, 0),
      cartAdds: data.reduce((acc, curr) => acc + curr.cartAdds, 0),
      purchases: data.reduce((acc, curr) => acc + curr.purchases, 0),
    };

    const brand = {
      impressions: data.reduce((acc, curr) => acc + curr.brandImpressions, 0),
      clicks: data.reduce((acc, curr) => acc + curr.brandClicks, 0),
      cartAdds: data.reduce((acc, curr) => acc + curr.brandCartAdds, 0),
      purchases: data.reduce((acc, curr) => acc + curr.brandPurchases, 0),
    };

    return [
      { step: 'Impressions', total: total.impressions, brand: brand.impressions, share: (brand.impressions / total.impressions) * 100 },
      { step: 'Clicks', total: total.clicks, brand: brand.clicks, share: (brand.clicks / total.clicks) * 100 },
      { step: 'Cart Adds', total: total.cartAdds, brand: brand.cartAdds, share: (brand.cartAdds / total.cartAdds) * 100 },
      { step: 'Purchases', total: total.purchases, brand: brand.purchases, share: (brand.purchases / total.purchases) * 100 },
    ];
  }, [data]);

  const segmentationStats = useMemo(() => {
    if (!data.length) return null;
    const branded = data.filter(d => d.type === 'branded');
    const generic = data.filter(d => d.type === 'generic');

    const getStats = (items: SQPData[]) => ({
      count: items.length,
      volume: items.reduce((acc, curr) => acc + curr.volume, 0),
      purchases: items.reduce((acc, curr) => acc + curr.brandPurchases, 0),
      avgShare: items.reduce((acc, curr) => acc + curr.brandPurchaseShare, 0) / (items.length || 1)
    });

    return {
      branded: getStats(branded),
      generic: getStats(generic),
      totalVolume: data.reduce((acc, curr) => acc + curr.volume, 0),
      totalPurchases: data.reduce((acc, curr) => acc + curr.brandPurchases, 0)
    };
  }, [data]);

  const keywordInsights = useMemo(() => {
    if (data.length === 0) return [];
    
    const words: Record<string, { count: number; volume: number; brandPurchases: number; avgShare: number }> = {};
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'their', 'our', 'its', 'about', 'into', 'over', 'under', 'through', 'between', 'among', 'during', 'before', 'after', 'above', 'below', 'around', 'across', 'against', 'along', 'around', 'at', 'by', 'for', 'from', 'in', 'into', 'near', 'of', 'off', 'on', 'onto', 'out', 'over', 'through', 'to', 'up', 'with']);

    data.forEach(item => {
      const parts = item.query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      parts.forEach(word => {
        if (!words[word]) words[word] = { count: 0, volume: 0, brandPurchases: 0, avgShare: 0 };
        words[word].count += 1;
        words[word].volume += item.volume;
        words[word].brandPurchases += item.brandPurchases;
        words[word].avgShare += item.brandImpressionShare;
      });
    });

    return Object.entries(words)
      .map(([word, stats]) => ({
        word,
        ...stats,
        avgShare: stats.avgShare / stats.count
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 20);
  }, [data]);

  const topMovers = useMemo(() => {
    if (datasets.length < 2) return null;
    const current = datasets[datasets.length - 1];
    const previous = datasets[datasets.length - 2];
    
    const prevMap = new Map<string, SQPData>(previous.data.map(d => [d.query, d]));
    
    const movers = current.data.map(curr => {
      const prev = prevMap.get(curr.query);
      if (!prev) return null;
      
      return {
        query: curr.query,
        volumeDelta: curr.volume - prev.volume,
        shareDelta: curr.brandImpressionShare - prev.brandImpressionShare,
        purchaseDelta: curr.brandPurchases - prev.brandPurchases,
      };
    }).filter((m): m is { query: string; volumeDelta: number; shareDelta: number; purchaseDelta: number } => m !== null);

    return {
      volume: [...movers].sort((a, b) => b.volumeDelta - a.volumeDelta).slice(0, 5),
      share: [...movers].sort((a, b) => b.shareDelta - a.shareDelta).slice(0, 5),
      decline: [...movers].sort((a, b) => a.volumeDelta - b.volumeDelta).slice(0, 5),
    };
  }, [datasets]);

  const exportToCSV = () => {
    const headers = ['Search Query', 'Volume', 'Impression Share', 'Click Share', 'Cart Add Share', 'Purchase Share', 'CTR', 'CVR'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.query}"`,
        item.volume,
        item.brandImpressionShare.toFixed(2),
        item.brandClickShare.toFixed(2),
        item.brandCartAddShare.toFixed(2),
        item.brandPurchaseShare.toFixed(2),
        item.ctr.toFixed(2),
        item.cvr.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sqp_export_${activeDataset?.name || 'data'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Amazon SQP Analyzer</h1>
            <p className="text-gray-500 text-sm max-w-md">
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
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden md:block tracking-tight">SQP Analyzer</span>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px]",
              activeTab === 'dashboard' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:block">Dashboard</span>
          </button>
          {datasets.length > 1 && (
            <button
              onClick={() => setActiveTab('comparison')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px]",
                activeTab === 'comparison' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:block">Comparison</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('funnel')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px]",
              activeTab === 'funnel' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden md:block">Funnel Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px]",
              activeTab === 'keywords' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:block">Keyword Insights</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[13px]",
              activeTab === 'table' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <TableIcon className="w-4 h-4" />
            <span className="hidden md:block">Data Explorer</span>
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <div className="mb-6 px-4">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">My Brand Name</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter brand name..."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-gray-300"
              />
              {brandName && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              )}
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5 italic">Used for Branded vs Generic segmentation</p>
          </div>

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
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-gray-900">
              {activeTab === 'dashboard' ? 'Market Overview' : 
               activeTab === 'comparison' ? 'Period Comparison' : 
               activeTab === 'funnel' ? 'Conversion Funnel' :
               activeTab === 'keywords' ? 'Keyword Analysis' :
               'Search Query Database'}
            </h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <p className="text-[13px] text-gray-500 font-medium">
              {activeDataset?.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {datasets.length > 0 && activeTab !== 'comparison' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Period:</span>
                <select 
                  value={selectedPeriodId || ''}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-gray-100 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <select 
                value={dashboardMetric}
                onChange={(e) => setDashboardMetric(e.target.value as keyof SQPData)}
                className="bg-gray-100 border-none rounded-lg text-[12px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="brandImpressionShare">Impression Share</option>
                <option value="brandClickShare">Click Share</option>
                <option value="brandPurchaseShare">Purchase Share</option>
                <option value="volume">Search Volume</option>
              </select>
            )}
            {activeTab === 'table' && (
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-lg text-[13px] focus:ring-2 focus:ring-emerald-500/20 w-56 transition-all"
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
              <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[13px] font-bold hover:bg-emerald-700 transition-all">
                <Upload className="w-3.5 h-3.5" />
                Add Period
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'comparison' ? (
            comparisonData ? (
              <div className="space-y-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Performance Delta</h3>
                      <p className="text-[13px] text-gray-500">Comparing {comparisonData.periods.current} vs {comparisonData.periods.previous}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Previous Period</span>
                        <select 
                          value={comparisonPeriodIds.previous || ''}
                          onChange={(e) => setComparisonPeriodIds(prev => ({ ...prev, previous: e.target.value }))}
                          className="bg-gray-50 border border-gray-200 rounded-lg text-[12px] font-bold px-3 py-1.5 outline-none"
                        >
                          {datasets.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Period</span>
                        <select 
                          value={comparisonPeriodIds.current || ''}
                          onChange={(e) => setComparisonPeriodIds(prev => ({ ...prev, current: e.target.value }))}
                          className="bg-gray-50 border border-gray-200 rounded-lg text-[12px] font-bold px-3 py-1.5 outline-none"
                        >
                          {datasets.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {comparisonData.metrics.map((m, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{m.label}</p>
                        <div className="flex items-end justify-between">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900 font-mono">
                              {m.unit === '%' ? m.current.toFixed(1) : m.current.toLocaleString()}{m.unit}
                            </h4>
                            <p className="text-[10px] text-gray-400">Prev: {m.unit === '%' ? m.previous.toFixed(1) : m.previous.toLocaleString()}{m.unit}</p>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                            m.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}>
                            {m.delta >= 0 ? '+' : ''}{m.percentChange.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 overflow-hidden rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Metric</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{comparisonData.periods.previous}</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{comparisonData.periods.current}</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Delta</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">% Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {comparisonData.metrics.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{m.label}</td>
                            <td className="px-6 py-4 text-[13px] text-gray-600 font-mono">
                              {m.unit === '%' ? m.previous.toFixed(2) : m.previous.toLocaleString()}{m.unit}
                            </td>
                            <td className="px-6 py-4 text-[13px] text-gray-900 font-bold font-mono">
                              {m.unit === '%' ? m.current.toFixed(2) : m.current.toLocaleString()}{m.unit}
                            </td>
                            <td className={cn(
                              "px-6 py-4 text-[13px] font-bold font-mono",
                              m.delta >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {m.delta >= 0 ? '+' : ''}{m.unit === '%' ? m.delta.toFixed(2) : m.delta.toLocaleString()}{m.unit}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[11px] font-bold",
                                m.percentChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              )}>
                                {m.percentChange >= 0 ? '+' : ''}{m.percentChange.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {topMovers && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Top Growth Queries
                      </h3>
                      <div className="space-y-3">
                        {topMovers.volume.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[120px]">{m.query}</span>
                            <span className="text-[12px] font-bold text-emerald-600">+{m.volumeDelta.toLocaleString()} vol</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        Share Gainers
                      </h3>
                      <div className="space-y-3">
                        {topMovers.share.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[120px]">{m.query}</span>
                            <span className="text-[12px] font-bold text-blue-600">+{m.shareDelta.toFixed(1)}% share</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Top Declines
                      </h3>
                      <div className="space-y-3">
                        {topMovers.decline.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[120px]">{m.query}</span>
                            <span className="text-[12px] font-bold text-red-600">{m.volumeDelta.toLocaleString()} vol</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                  <Database className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Compare Two Reports</h3>
                <p className="text-gray-500 text-center max-w-md mb-8">
                  Upload a second Search Query Performance report to see detailed deltas, 
                  growth trends, and share changes across all metrics.
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                    <Upload className="w-5 h-5" />
                    Upload Second Report
                  </button>
                </div>
              </div>
            )
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

              {/* Advanced Insights Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branded vs Generic Segmentation */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Brand Segmentation</h3>
                      <p className="text-[12px] text-gray-500">Branded vs Generic performance</p>
                    </div>
                    <Info className="w-4 h-4 text-gray-300 cursor-help" />
                  </div>
                  
                  {segmentationStats ? (
                    <>
                      <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Branded', value: segmentationStats.branded.volume },
                                { name: 'Generic', value: segmentationStats.generic.volume },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#3b82f6" />
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [`${((value / segmentationStats.totalVolume) * 100).toFixed(1)}%`, 'Volume Share']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-bold text-gray-900 font-mono">
                            {((segmentationStats.branded.volume / segmentationStats.totalVolume) * 100).toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Branded</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Branded Share</p>
                          <p className="text-lg font-bold text-emerald-900 font-mono">{segmentationStats.branded.avgShare.toFixed(1)}%</p>
                          <p className="text-[10px] text-emerald-600 mt-1">{segmentationStats.branded.purchases} Purchases</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Generic Share</p>
                          <p className="text-lg font-bold text-blue-900 font-mono">{segmentationStats.generic.avgShare.toFixed(1)}%</p>
                          <p className="text-[10px] text-blue-600 mt-1">{segmentationStats.generic.purchases} Purchases</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm italic">
                      Enter brand name to see segmentation
                    </div>
                  )}
                </div>

                {/* Efficiency Matrix (Scatter Chart) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Efficiency Matrix</h3>
                      <p className="text-[12px] text-gray-500">Impression Share vs Purchase Share (Bubble size = Volume)</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Branded
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Generic
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          type="number" 
                          dataKey="brandImpressionShare" 
                          name="Impression Share" 
                          unit="%" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          label={{ value: 'Impression Share %', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="brandPurchaseShare" 
                          name="Purchase Share" 
                          unit="%" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          label={{ value: 'Purchase Share %', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <ZAxis type="number" dataKey="volume" range={[50, 400]} name="Volume" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100">
                                  <p className="text-[13px] font-bold text-gray-900 mb-2">{data.query}</p>
                                  <div className="space-y-1">
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[11px] text-gray-500">Imp. Share:</span>
                                      <span className="text-[11px] font-bold text-gray-900">{data.brandImpressionShare.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[11px] text-gray-500">Purch. Share:</span>
                                      <span className="text-[11px] font-bold text-emerald-600">{data.brandPurchaseShare.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <span className="text-[11px] text-gray-500">Volume:</span>
                                      <span className="text-[11px] font-bold text-gray-900">{data.volume.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter 
                          name="Branded" 
                          data={data.filter(d => d.type === 'branded')} 
                          fill="#10b981" 
                          fillOpacity={0.6}
                          stroke="#059669"
                        />
                        <Scatter 
                          name="Generic" 
                          data={data.filter(d => d.type === 'generic')} 
                          fill="#3b82f6" 
                          fillOpacity={0.6}
                          stroke="#2563eb"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Performance by Query</h3>
                      <p className="text-[13px] text-gray-500">Top 10 queries by search volume</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {dashboardMetric === 'volume' ? 'Volume' : 
                           dashboardMetric === 'brandImpressionShare' ? 'Impression Share' :
                           dashboardMetric === 'brandClickShare' ? 'Click Share' : 'Purchase Share'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topQueriesByVolume} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="query" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          interval={0}
                          tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          unit={dashboardMetric === 'volume' ? '' : '%'}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey={dashboardMetric} 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]} 
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-6">Market Share Distribution</h3>
                  <div className="h-[260px] w-full relative">
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
                          innerRadius={50}
                          outerRadius={80}
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
                      <span className="text-xl font-bold text-gray-900 font-mono">{data.length}</span>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Queries</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <LegendItem color={COLORS[0]} label="High Share" count={data.filter(d => d.brandImpressionShare > 15).length} />
                    <LegendItem color={COLORS[1]} label="Mid Share" count={data.filter(d => d.brandImpressionShare >= 5 && d.brandImpressionShare <= 15).length} />
                    <LegendItem color={COLORS[2]} label="Low Share" count={data.filter(d => d.brandImpressionShare < 5).length} />
                  </div>
                </div>
              </div>

              {/* Top Opportunities */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Growth Opportunities</h3>
                    <p className="text-[13px] text-gray-500">High volume queries with low brand share</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('table')}
                    className="text-emerald-600 text-[13px] font-bold hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data
                    .filter(d => d.brandImpressionShare < 10 && d.volume > summaryStats.totalVolume / data.length)
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opportunity</span>
                        </div>
                        <h4 className="font-bold text-[14px] text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{item.query}</h4>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] text-gray-500">Volume: <span className="font-bold text-gray-700 font-mono">{item.volume.toLocaleString()}</span></span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-gray-500">Current Share</span>
                            <span className="font-bold text-gray-900 font-mono">{item.brandImpressionShare.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${item.brandImpressionShare}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'funnel' ? (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900">Conversion Funnel</h3>
                  <p className="text-sm text-gray-500">Brand performance vs Total Market across the shopping journey</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    {funnelData.map((step, idx) => (
                      <div key={idx} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-700">{step.step}</span>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            {step.share.toFixed(1)}% Brand Share
                          </span>
                        </div>
                        <div className="h-12 w-full bg-gray-100 rounded-xl overflow-hidden relative">
                          <div 
                            className="h-full bg-gray-200 transition-all duration-1000"
                            style={{ width: `${(step.total / funnelData[0].total) * 100}%` }}
                          ></div>
                          <div 
                            className="absolute inset-0 h-full bg-emerald-500 transition-all duration-1000"
                            style={{ width: `${(step.brand / funnelData[0].total) * 100}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                            <span className="text-[10px] font-bold text-gray-600">Total: {step.total.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-white">Brand: {step.brand.toLocaleString()}</span>
                          </div>
                        </div>
                        {idx < funnelData.length - 1 && (
                          <div className="flex justify-center my-1">
                            <div className="w-px h-4 bg-gray-200"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-widest">Funnel Insights</h4>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                          <MousePointer2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Click-Through Rate</p>
                          <p className="text-lg font-bold text-gray-900 font-mono">
                            {((funnelData[1].brand / funnelData[0].brand) * 100).toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">Market Avg: {((funnelData[1].total / funnelData[0].total) * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cart Add Rate</p>
                          <p className="text-lg font-bold text-gray-900 font-mono">
                            {((funnelData[2].brand / funnelData[1].brand) * 100).toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">Market Avg: {((funnelData[2].total / funnelData[1].total) * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Purchase Conversion</p>
                          <p className="text-lg font-bold text-gray-900 font-mono">
                            {((funnelData[3].brand / funnelData[2].brand) * 100).toFixed(2)}%
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">Market Avg: {((funnelData[3].total / funnelData[2].total) * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'keywords' ? (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900">Keyword Insights</h3>
                  <p className="text-sm text-gray-500">Performance breakdown by common search terms</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {keywordInsights.map((k, idx) => (
                    <div key={idx} className="p-5 rounded-xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-white rounded-full text-[13px] font-bold text-gray-900 shadow-sm group-hover:text-emerald-600">
                          {k.word}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{k.count} Queries</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Volume</p>
                          <p className="text-sm font-bold text-gray-900 font-mono">{k.volume.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Avg Share</p>
                          <p className="text-sm font-bold text-emerald-600 font-mono">{k.avgShare.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-gray-500">Brand Purchases</span>
                          <span className="text-[11px] font-bold text-gray-900 font-mono">{k.brandPurchases.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('query')}>
                        <div className="flex items-center gap-2">Search Query <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('type')}>
                        <div className="flex items-center gap-2">Type <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('volume')}>
                        <div className="flex items-center gap-2">Volume <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandImpressionShare')}>
                        <div className="flex items-center gap-2">Imp. Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandClickShare')}>
                        <div className="flex items-center gap-2">Click Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('brandPurchaseShare')}>
                        <div className="flex items-center gap-2">Purch. Share <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('ctr')}>
                        <div className="flex items-center gap-2">CTR <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-600" onClick={() => requestSort('cvr')}>
                        <div className="flex items-center gap-2">CVR <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-[13px] font-semibold text-gray-900">{item.query}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            item.type === 'branded' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-gray-600 font-mono">{item.volume.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(item.brandImpressionShare, 100)}%` }}></div>
                            </div>
                            <span className="text-[13px] font-bold text-gray-700 font-mono">{item.brandImpressionShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.min(item.brandClickShare, 100)}%` }}></div>
                            </div>
                            <span className="text-[13px] font-bold text-gray-700 font-mono">{item.brandClickShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${Math.min(item.brandPurchaseShare, 100)}%` }}></div>
                            </div>
                            <span className="text-[13px] font-bold text-gray-700 font-mono">{item.brandPurchaseShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[13px] font-medium text-gray-500 font-mono">{item.ctr.toFixed(2)}%</td>
                        <td className="px-6 py-4 text-[13px] font-medium text-gray-500 font-mono">{item.cvr.toFixed(2)}%</td>
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

function StatCard({ title, value, icon, color, className }: { title: string; value: string; icon: React.ReactNode; color: string; className?: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className={cn("bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
        </div>
        <Info className="w-3.5 h-3.5 text-gray-300 cursor-help" />
      </div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <h4 className="text-xl font-bold text-gray-900 tracking-tight font-mono">{value}</h4>
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
