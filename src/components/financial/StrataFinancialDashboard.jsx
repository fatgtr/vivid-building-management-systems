import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, TrendingUp, DollarSign, Building2, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

// ─── Data extracted from Strata Plan No. 99831 – 12 Phillips Road Kogarah ───

const REPORT_META = {
  strata_plan: '99831',
  address: '12 Phillips Road, Kogarah NSW 2217',
  period: '01/07/26 – 31/07/26',
  strata_manager: 'Kieran Spink (Bright & Duggan)',
};

const BALANCE_SHEET = {
  as_at: '31/07/2026',
  prior: '30/06/2026',
  owners_funds: {
    admin_fund: -218833.77,
    capital_works_fund: 24242.22,
    total: -194591.55,
  },
  assets: {
    cash_at_bank: 130215.47,
    levies_in_arrears: 12219.82,
    other_arrears: 18249.49,
    interest_overdue: 2233.76,
    prepayments: 0,
    total: 162918.54,
  },
  liabilities: {
    gst_clearing: -19028.87,
    creditors: 128946.62,
    levies_in_advance: 247592.34,
    total: 357510.09,
  },
  bank_admin: 79614.74,
  bank_cworks: 50600.73,
  bank_total: 130215.47,
};

const ADMIN_FUND = {
  income: {
    actual: 1149.50,
    budget: 561168.18,
    prior_year: 239997.83,
  },
  expenditure: {
    actual: 208200.01,
    budget: 387795.45,
    prior_year: 317098.11,
    breakdown: [
      { category: 'Insurance Premiums', actual: 190781.25, budget: 193000 },
      { category: 'Fire Alarm Monitoring', actual: 14643.12, budget: 22300 },
      { category: 'Strata Mgr Consultancy', actual: 2876.24, budget: 20000 },
      { category: 'Management Fees', actual: 2125.00, budget: 26400 },
      { category: 'Disbursements', actual: 3822.59, budget: 12000 },
      { category: 'Lift Maintenance', actual: 1399.72, budget: 5700 },
      { category: 'Garage Door R&M', actual: 5865.75, budget: 2600 },
      { category: 'Cleaning', actual: 1537.04, budget: 19305 },
      { category: 'General Building R&M', actual: 1650.00, budget: 10000 },
      { category: 'Fire Protection Repairs', actual: 495.00, budget: 47000 },
      { category: 'Electricity', actual: 1184.51, budget: 14300 },
      { category: 'Security', actual: 143.00, budget: 0 },
      { category: 'Telephone', actual: 457.50, budget: 2800 },
      { category: 'Bank Charges', actual: 129.50, budget: 750 },
    ]
  },
  surplus_deficit: -207050.51,
  opening_balance: -11783.26,
  closing_balance: -218833.77,
  budget_balance: 161589.47,
};

const CAPITAL_WORKS_FUND = {
  income: {
    actual: 0,
    budget: 90909.09,
    prior_year: 63636.44,
  },
  expenditure: {
    actual: 0,
    budget: 23818.18,
    prior_year: 14666.91,
    breakdown: [
      { category: 'Electrical Repairs', actual: 0, budget: 7600 },
      { category: 'Garage Door R&M', actual: 0, budget: 8600 },
      { category: 'General Building R&M', actual: 0, budget: 10000 },
    ]
  },
  surplus_deficit: 0,
  opening_balance: 24242.22,
  closing_balance: 24242.22,
  budget_balance: 91333.13,
};

const CREDITORS = [
  { name: 'Bright & Duggan Pty Ltd', amount: 52765.04 },
  { name: 'Romteck Grid Pty Ltd', amount: 18576.70 },
  { name: 'Collective Insurance Brokers', amount: 0 },
  { name: 'Australian Taxation Office', amount: 12005.00 },
  { name: 'Greater Glass', amount: 7612.00 },
  { name: 'Simplified Fire Solutions', amount: 7004.25 },
  { name: 'Allgate', amount: 4523.20 },
  { name: 'Biv Reports Pty Limited', amount: 4004.00 },
  { name: 'Grace Lawyers P/L', amount: 4242.75 },
  { name: 'Timeless Commercial Clean', amount: 11105.43 },
  { name: 'Elevator Services Group', amount: 2799.44 },
  { name: 'Jme Building Services', amount: 2915.00 },
  { name: 'Inner West Locksmiths', amount: 1041.81 },
  { name: 'Sprint Electrical', amount: 352.00 },
];

const PAYMENTS_DRAWN = [
  { payee: 'Collective Insurance Brokers', payment: 'F000359/360', details: 'Insurance 30/06/26-30/06/27', amount: 190781.25, category: 'Insurance' },
  { payee: 'Romteck Grid Pty Ltd', payment: 'F000361 via Accts Summary', details: 'Fire Alarm Monitoring x8 FFA', amount: 14643.12, category: 'Fire Safety' },
  { payee: 'Allgate / AGC Auto Gate', payment: 'F000357/362', details: 'Garage Door Motor repairs + deposit', amount: 8491.75, category: 'Maintenance' },
  { payee: 'Timeless Commercial Clean', payment: 'Accts Summary', details: 'June 2026 Cleaning', amount: 1537.04, category: 'Cleaning' },
  { payee: 'Bright & Duggan Pty Ltd', payment: 'Accts Summary', details: 'Management + Consultancy + Disbursements', amount: 8822.83, category: 'Management' },
  { payee: 'Simplified Fire Solutions', payment: 'Accts Summary', details: 'Detector Faults + Log Book', amount: 495.00, category: 'Fire Safety' },
  { payee: 'Elevator Services Group', payment: 'Accts Summary', details: 'Lift Maintenance Jul-Sep 2026', amount: 1399.72, category: 'Lift' },
  { payee: 'Jme Building Services', payment: 'F000358 area', details: 'Front Gate Pickets', amount: 1650.00, category: 'Maintenance' },
  { payee: 'Energy Locals Urban', payment: 'F000363', details: 'Electricity 01/06/26-30/06/26', amount: 1184.51, category: 'Utilities' },
  { payee: 'Ad-Tech Security', payment: 'F000361', details: 'Security monitoring (7 months)', amount: 500.50, category: 'Security' },
  { payee: 'Accucom Systems Integration', payment: 'F000356/364', details: 'Telephone July/August 2026', amount: 457.50, category: 'Utilities' },
];

const fmt = (n) => n < 0
  ? `(${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
  : `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORY_COLORS = {
  Insurance: 'bg-blue-100 text-blue-800',
  'Fire Safety': 'bg-red-100 text-red-800',
  Maintenance: 'bg-orange-100 text-orange-800',
  Management: 'bg-purple-100 text-purple-800',
  Cleaning: 'bg-green-100 text-green-800',
  Utilities: 'bg-yellow-100 text-yellow-800',
  Security: 'bg-slate-100 text-slate-800',
  Lift: 'bg-cyan-100 text-cyan-800',
};

function SummaryCard({ title, value, sub, icon: Icon, variant = 'default' }) {
  const colors = {
    default: 'text-slate-700',
    danger: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <p className={`text-xl font-bold ${colors[variant]}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-50' : variant === 'success' ? 'bg-green-50' : 'bg-slate-50'}`}>
            <Icon className={`h-5 w-5 ${colors[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StrataFinancialDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const topExpenses = [...ADMIN_FUND.expenditure.breakdown]
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 8);

  const overBudget = ADMIN_FUND.expenditure.breakdown.filter(
    (e) => e.budget > 0 && e.actual > e.budget
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Strata Financial Dashboard</h2>
            </div>
            <p className="text-sm text-slate-600">{REPORT_META.address}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Strata Plan No. {REPORT_META.strata_plan} · {REPORT_META.period} · {REPORT_META.strata_manager}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-800 border-0">
              Admin Bank: {fmt(BALANCE_SHEET.bank_admin)}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border-0">
              CWF Bank: {fmt(BALANCE_SHEET.bank_cworks)}
            </Badge>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Funds Available"
          value={fmt(BALANCE_SHEET.bank_total)}
          sub="Cash at bank"
          icon={DollarSign}
          variant="success"
        />
        <SummaryCard
          title="Admin Fund Balance"
          value={fmt(BALANCE_SHEET.owners_funds.admin_fund)}
          sub="Owners funds"
          icon={TrendingDown}
          variant="danger"
        />
        <SummaryCard
          title="Capital Works Fund"
          value={fmt(BALANCE_SHEET.owners_funds.capital_works_fund)}
          sub="Opening = closing (no spend)"
          icon={TrendingUp}
          variant="success"
        />
        <SummaryCard
          title="Outstanding Creditors"
          value={fmt(BALANCE_SHEET.liabilities.creditors)}
          sub="Accounts payable"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admin">Admin Fund</TabsTrigger>
          <TabsTrigger value="capital">Capital Works</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="creditors">Creditors</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Balance Sheet Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Balance Sheet – as at 31 July 2026</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="font-semibold text-slate-600 uppercase text-xs tracking-wider">Owners Funds</div>
                <div className="flex justify-between"><span className="text-slate-600">Administrative Fund</span><span className="text-red-600 font-medium">{fmt(BALANCE_SHEET.owners_funds.admin_fund)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Capital Works Fund</span><span className="text-green-600 font-medium">{fmt(BALANCE_SHEET.owners_funds.capital_works_fund)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><span>Total</span><span className="text-red-600">{fmt(BALANCE_SHEET.owners_funds.total)}</span></div>

                <div className="font-semibold text-slate-600 uppercase text-xs tracking-wider pt-2">Current Assets</div>
                <div className="flex justify-between"><span className="text-slate-600">Cash at Bank</span><span>{fmt(BALANCE_SHEET.assets.cash_at_bank)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Levies in Arrears</span><span>{fmt(BALANCE_SHEET.assets.levies_in_arrears)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Other Arrears</span><span>{fmt(BALANCE_SHEET.assets.other_arrears)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Interest on Overdue</span><span>{fmt(BALANCE_SHEET.assets.interest_overdue)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><span>Total Assets</span><span>{fmt(BALANCE_SHEET.assets.total)}</span></div>

                <div className="font-semibold text-slate-600 uppercase text-xs tracking-wider pt-2">Liabilities</div>
                <div className="flex justify-between"><span className="text-slate-600">GST Clearing Account</span><span className="text-red-500">{fmt(BALANCE_SHEET.liabilities.gst_clearing)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Creditors</span><span>{fmt(BALANCE_SHEET.liabilities.creditors)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Levies in Advance</span><span>{fmt(BALANCE_SHEET.liabilities.levies_in_advance)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><span>Total Liabilities</span><span className="text-red-600">{fmt(BALANCE_SHEET.liabilities.total)}</span></div>
              </CardContent>
            </Card>

            {/* Expenditure vs Budget chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Fund — Top Expenses vs Budget</CardTitle>
                <CardDescription>July 2026 actuals against full-year budget</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topExpenses} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="budget" name="Budget" fill="#e2e8f0" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Over-budget alert */}
          {overBudget.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Budget Overruns This Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overBudget.map((e) => (
                    <div key={e.category} className="flex items-center justify-between text-sm">
                      <span className="text-amber-900">{e.category}</span>
                      <div className="flex gap-3 items-center">
                        <span className="text-slate-500 text-xs">Budget: {fmt(e.budget)}</span>
                        <span className="text-red-700 font-semibold">Actual: {fmt(e.actual)}</span>
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                          +{fmt(e.actual - e.budget)} over
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── ADMIN FUND ── */}
        <TabsContent value="admin" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Income Summary</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Actual (Jul 26)</span><span className="font-medium">{fmt(ADMIN_FUND.income.actual)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Full-Year Budget</span><span>{fmt(ADMIN_FUND.income.budget)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Prior Year</span><span>{fmt(ADMIN_FUND.income.prior_year)}</span></div>
                <Progress value={(ADMIN_FUND.income.actual / ADMIN_FUND.income.budget) * 100} className="mt-2" />
                <p className="text-xs text-slate-400">{((ADMIN_FUND.income.actual / ADMIN_FUND.income.budget) * 100).toFixed(1)}% of budget collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Expenditure Summary</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Actual (Jul 26)</span><span className="font-medium text-red-600">{fmt(ADMIN_FUND.expenditure.actual)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Full-Year Budget</span><span>{fmt(ADMIN_FUND.expenditure.budget)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Prior Year</span><span>{fmt(ADMIN_FUND.expenditure.prior_year)}</span></div>
                <Progress value={(ADMIN_FUND.expenditure.actual / ADMIN_FUND.expenditure.budget) * 100} className="mt-2" />
                <p className="text-xs text-slate-400">{((ADMIN_FUND.expenditure.actual / ADMIN_FUND.expenditure.budget) * 100).toFixed(1)}% of budget spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Fund Balance</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Opening Balance</span><span className="text-red-600">{fmt(ADMIN_FUND.opening_balance)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Surplus / Deficit</span><span className="text-red-600">{fmt(ADMIN_FUND.surplus_deficit)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>Closing Balance</span><span className="text-red-600">{fmt(ADMIN_FUND.closing_balance)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Budget target</span><span className="text-green-600">{fmt(ADMIN_FUND.budget_balance)}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Expenditure Breakdown vs Budget</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ADMIN_FUND.expenditure.breakdown.map((item) => {
                  const pct = item.budget > 0 ? Math.min((item.actual / item.budget) * 100, 100) : 0;
                  const over = item.budget > 0 && item.actual > item.budget;
                  return (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={over ? 'text-red-700 font-medium' : 'text-slate-700'}>{item.category}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="text-slate-400">Budget: {fmt(item.budget)}</span>
                          <span className={over ? 'text-red-600 font-semibold' : 'text-slate-700'}>Actual: {fmt(item.actual)}</span>
                        </div>
                      </div>
                      <Progress value={pct} className={over ? 'bg-red-100 [&>div]:bg-red-500' : ''} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAPITAL WORKS ── */}
        <TabsContent value="capital" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capital Works Fund — Statement</CardTitle>
                <CardDescription>Period 01/07/26 – 31/07/26</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="font-semibold text-slate-500 uppercase text-xs tracking-wider">Income</div>
                <div className="flex justify-between"><span>CWF Levies Actual</span><span>{fmt(CAPITAL_WORKS_FUND.income.actual)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Full-Year Budget</span><span>{fmt(CAPITAL_WORKS_FUND.income.budget)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Prior Year</span><span>{fmt(CAPITAL_WORKS_FUND.income.prior_year)}</span></div>

                <div className="font-semibold text-slate-500 uppercase text-xs tracking-wider pt-3">Expenditure</div>
                <div className="flex justify-between"><span>Actual Spend</span><span>{fmt(CAPITAL_WORKS_FUND.expenditure.actual)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Budget</span><span>{fmt(CAPITAL_WORKS_FUND.expenditure.budget)}</span></div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between"><span>Opening Balance</span><span className="font-medium text-green-600">{fmt(CAPITAL_WORKS_FUND.opening_balance)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Closing Balance</span><span className="text-green-600">{fmt(CAPITAL_WORKS_FUND.closing_balance)}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Budget Target</span><span className="text-blue-600">{fmt(CAPITAL_WORKS_FUND.budget_balance)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Budgeted Capital Works Projects</CardTitle>
                <CardDescription>Full-year budget allocations yet to be spent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CAPITAL_WORKS_FUND.expenditure.breakdown.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.category}</p>
                        <p className="text-xs text-slate-500">Budget: {fmt(item.budget)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-700">{fmt(item.actual)} spent</p>
                      <p className="text-xs text-slate-400">{fmt(item.budget - item.actual)} remaining</p>
                    </div>
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800">No Capital Works expenditure in July 2026.</p>
                  <p className="text-blue-600 text-xs mt-1">All budgeted amounts ({fmt(CAPITAL_WORKS_FUND.expenditure.budget)}) remain available for the year.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PAYMENTS ── */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payments Drawn — July 2026</CardTitle>
              <CardDescription>Total: {fmt(201807.36)} | Receipts: {fmt(209501.46)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-slate-500 font-medium">Payee / Contractor</th>
                      <th className="text-left py-2 text-slate-500 font-medium">Description</th>
                      <th className="text-center py-2 text-slate-500 font-medium">Category</th>
                      <th className="text-right py-2 text-slate-500 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAYMENTS_DRAWN.map((p, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 font-medium text-slate-800">{p.payee}</td>
                        <td className="py-2 text-slate-500 text-xs">{p.details}</td>
                        <td className="py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[p.category] || 'bg-slate-100 text-slate-600'}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="py-2 font-semibold text-slate-700">Total Payments Drawn</td>
                      <td className="py-2 text-right font-bold text-slate-900">{fmt(201807.36)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CREDITORS ── */}
        <TabsContent value="creditors">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Creditors Balance — 31 July 2026</CardTitle>
              <CardDescription>Total outstanding: {fmt(128946.62)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CREDITORS.sort((a, b) => b.amount - a.amount).map((c) => {
                  const pct = (c.amount / 128946.62) * 100;
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="w-44 flex-shrink-0 text-sm text-slate-700">{c.name}</div>
                      <div className="flex-1">
                        <Progress value={pct} />
                      </div>
                      <div className="w-24 text-right text-sm font-medium">{fmt(c.amount)}</div>
                      <div className="w-10 text-right text-xs text-slate-400">{pct.toFixed(0)}%</div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                  <div className="w-44 flex-shrink-0 text-sm font-bold text-slate-900">Total</div>
                  <div className="flex-1"></div>
                  <div className="w-24 text-right text-sm font-bold">{fmt(128946.62)}</div>
                  <div className="w-10"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}