import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Avatar
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  AccountBalance,
  ShowChart,
  PieChart,
  Assessment,
  MoreVert,
  Refresh,
  Download,
  CalendarToday
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const FinancialDashboard = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await axios.get('/api/financial-reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
        setError(null);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getGrowthColor = (value) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  const getGrowthIcon = (value) => {
    if (value > 0) return <TrendingUp color="success" fontSize="small" />;
    if (value < 0) return <TrendingDown color="error" fontSize="small" />;
    return null;
  };

  // Chart colors
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
          <Button onClick={() => fetchDashboardData()} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  const { summary, trends, insights } = dashboardData || {};

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Financial Dashboard
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => setAnchorEl(null)}
          >
            Export
          </Button>
        </Stack>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AttachMoney />
                </Avatar>
                <Typography variant="h6">Monthly Revenue</Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {formatCurrency(summary?.currentMonthRevenue)}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {getGrowthIcon(summary?.revenueGrowth)}
                <Typography 
                  variant="body2" 
                  color={getGrowthColor(summary?.revenueGrowth)}
                  ml={0.5}
                >
                  {formatPercentage(summary?.revenueGrowth)} vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <ShowChart />
                </Avatar>
                <Typography variant="h6">YTD Revenue</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(summary?.currentYearRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Year-to-date performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Receipt />
                </Avatar>
                <Typography variant="h6">Outstanding</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(summary?.outstandingAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Pending invoices
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <AccountBalance />
                </Avatar>
                <Typography variant="h6">Cash Position</Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {formatCurrency(summary?.cashPosition)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Current balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={4}>
        {/* Revenue Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Revenue Trend" 
              subheader="Last 12 months"
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends?.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke={chartColors[0]} 
                    fill={chartColors[0]} 
                    fillOpacity={0.6} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Profit Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Profit Analysis" 
              subheader="Revenue vs Expenses"
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends?.profit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value)]} />
                  <Legend />
                  <Bar dataKey="revenue" fill={chartColors[1]} name="Revenue" />
                  <Bar dataKey="expenses" fill={chartColors[2]} name="Expenses" />
                  <Bar dataKey="profit" fill={chartColors[0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Cash Flow Trend */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Cash Flow Trend" 
              subheader="Operating cash flow"
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends?.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Cash Flow']} />
                  <Line 
                    type="monotone" 
                    dataKey="cashFlow" 
                    stroke={chartColors[3]} 
                    strokeWidth={2}
                    dot={{ fill: chartColors[3] }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Expense Categories" 
              subheader="Current month breakdown"
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(trends?.expenses?.[trends.expenses.length - 1]?.breakdown || {}).map(([name, value]) => ({
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(trends?.expenses?.[trends.expenses.length - 1]?.breakdown || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights Row */}
      <Grid container spacing={3}>
        {/* Top Customers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Top Customers" subheader="By revenue" />
            <CardContent sx={{ pt: 0 }}>
              <List>
                {insights?.topCustomers?.slice(0, 5).map((customer, index) => (
                  <ListItem key={customer.id} divider={index < 4}>
                    <ListItemText
                      primary={customer.name}
                      secondary={`${customer.invoiceCount} invoices`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(customer.totalRevenue)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Outstanding Invoices */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Outstanding Invoices" 
              subheader="Requires attention"
              action={
                <Chip 
                  label={`${insights?.outstandingInvoices?.length || 0} invoices`}
                  color="warning"
                  size="small"
                />
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <List>
                {insights?.outstandingInvoices?.slice(0, 5).map((invoice, index) => (
                  <ListItem key={invoice.id} divider={index < 4}>
                    <ListItemText
                      primary={`#${invoice.invoiceNumber}`}
                      secondary={invoice.customerName}
                    />
                    <ListItemSecondaryAction>
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(invoice.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {invoice.daysOutstanding} days
                        </Typography>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Expenses" subheader="Last 30 days" />
            <CardContent sx={{ pt: 0 }}>
              <List>
                {insights?.recentExpenses?.slice(0, 5).map((expense, index) => (
                  <ListItem key={expense.id} divider={index < 4}>
                    <ListItemText
                      primary={expense.description}
                      secondary={expense.category}
                    />
                    <ListItemSecondaryAction>
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(expense.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(expense.date), 'MMM dd')}
                        </Typography>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <Stack spacing={2}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<Assessment />}
                  href="/reports/profit-loss"
                >
                  View P&L Statement
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<PieChart />}
                  href="/reports/balance-sheet"
                >
                  Balance Sheet
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<ShowChart />}
                  href="/reports/cash-flow"
                >
                  Cash Flow Statement
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<CalendarToday />}
                  href="/reports/custom"
                >
                  Custom Reports
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FinancialDashboard;
