import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function EnergyConsumptionChart({ data = [] }) {
  // Group by month and energy type
  const chartData = data
    .sort((a, b) => new Date(a.reading_date) - new Date(b.reading_date))
    .reduce((acc, reading) => {
      const monthKey = format(new Date(reading.reading_date), 'MMM yyyy');
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          electricity: 0,
          gas: 0,
          water: 0,
          total_cost: 0
        };
      }
      
      if (reading.energy_type === 'electricity') {
        acc[monthKey].electricity += reading.consumption_kwh;
      } else if (reading.energy_type === 'gas') {
        acc[monthKey].gas += reading.consumption_kwh;
      } else if (reading.energy_type === 'water') {
        acc[monthKey].water += reading.consumption_kwh;
      }
      
      acc[monthKey].total_cost += reading.cost || 0;
      
      return acc;
    }, {});

  const chartArray = Object.values(chartData).slice(-12);

  if (chartArray.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">No consumption data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Energy Consumption (kWh)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="electricity" stroke="#3b82f6" name="Electricity" strokeWidth={2} />
              <Line type="monotone" dataKey="gas" stroke="#f59e0b" name="Gas" strokeWidth={2} />
              <Line type="monotone" dataKey="water" stroke="#10b981" name="Water" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Costs ($)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartArray}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_cost" fill="#8b5cf6" name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}