import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  LinearProgress,
  Avatar,
  Tab,
  Tabs,
  TabPanel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Upgrade,
  Add,
  Remove,
  Cancel,
  Receipt,
  Timeline,
  Warning,
  CheckCircle,
  Info,
  Person,
  Business,
  Storage,
  Inventory,
  AttachMoney
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`subscription-tabpanel-${index}`}
      aria-labelledby={`subscription-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SubscriptionManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState(null);
  
  // Dialog states
  const [changePlanDialog, setChangePlanDialog] = useState(false);
  const [addOnDialog, setAddOnDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedAddOn, setSelectedAddOn] = useState({ type: '', quantity: 1 });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelImmediate, setCancelImmediate] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Handle pre-selected plan from pricing page
  useEffect(() => {
    if (location.state?.selectedPlan && plans.length > 0) {
      const plan = plans.find(p => p.id === location.state.selectedPlan);
      if (plan) {
        setSelectedPlan({
          ...plan,
          billingPeriod: location.state.billingPeriod || 'monthly'
        });
        setChangePlanDialog(true);
      }
    }
  }, [location.state, plans]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscriptionResponse, plansResponse, billingResponse] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
        subscriptionService.getBillingHistory()
      ]);

      if (subscriptionResponse.success) {
        setSubscription(subscriptionResponse.data);
      }
      
      if (plansResponse.success) {
        setPlans(plansResponse.data.plans);
      }
      
      if (billingResponse.success) {
        setBillingHistory(billingResponse.data.billingHistory);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    try {
      setActionLoading('changePlan');
      const response = await subscriptionService.changePlan(
        selectedPlan.id, 
        selectedPlan.billingPeriod
      );
      
      if (response.success) {
        setChangePlanDialog(false);
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      setError(error.response?.data?.error || 'Failed to change plan');
    } finally {
      setActionLoading('');
    }
  };

  const handleAddAddOn = async () => {
    try {
      setActionLoading('addOn');
      const response = await subscriptionService.addAddOn(
        selectedAddOn.type,
        selectedAddOn.quantity
      );
      
      if (response.success) {
        setAddOnDialog(false);
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Error adding add-on:', error);
      setError(error.response?.data?.error || 'Failed to add add-on');
    } finally {
      setActionLoading('');
    }
  };

  const handleRemoveAddOn = async (addOnType) => {
    try {
      setActionLoading(`remove-${addOnType}`);
      const response = await subscriptionService.removeAddOn(addOnType);
      
      if (response.success) {
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Error removing add-on:', error);
      setError(error.response?.data?.error || 'Failed to remove add-on');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading('cancel');
      const response = await subscriptionService.cancelSubscription(
        cancelReason,
        cancelImmediate
      );
      
      if (response.success) {
        setCancelDialog(false);
        await loadSubscriptionData();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setActionLoading('');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
          <Button onClick={loadSubscriptionData} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Subscription Management
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Current Plan" />
          <Tab label="Usage & Limits" />
          <Tab label="Add-ons" />
          <Tab label="Billing History" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Current Plan */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader 
                title="Current Subscription"
                subheader={subscription?.company.subscriptionStatus}
                action={
                  <Chip
                    label={subscription?.company.subscriptionStatus?.toUpperCase()}
                    color={subscription?.company.subscriptionStatus === 'active' ? 'success' : 'warning'}
                  />
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {subscription?.company.subscriptionPlan || 'No Plan'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {subscription?.company.planTier && 
                        subscription.company.planTier.charAt(0).toUpperCase() + 
                        subscription.company.planTier.slice(1)
                      } Plan
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Billing: {subscription?.company.billingPeriod || 'monthly'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    {subscription?.nextBillingDate && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Next Billing Date
                        </Typography>
                        <Typography variant="body1">
                          {new Date(subscription.nextBillingDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                    
                    {subscription?.inTrial && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Trial ends: {new Date(subscription.trialEndDate).toLocaleDateString()}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<Upgrade />}
                  onClick={() => setChangePlanDialog(true)}
                >
                  Change Plan
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => setCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Plan Features" />
              <CardContent>
                <List dense>
                  {subscription?.features && Object.entries(subscription.features).map(([key, enabled]) => (
                    <ListItem key={key} disablePadding>
                      <ListItemText 
                        primary={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        secondary={enabled ? 'Included' : 'Not available'}
                      />
                      <ListItemSecondaryAction>
                        {enabled ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <Cancel color="disabled" fontSize="small" />
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Usage & Limits */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <Person />
                  </Avatar>
                  <Typography variant="h6">Users</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {subscription?.usage.users.current || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {subscription?.usage.users.limit === -1 ? '∞' : subscription?.usage.users.limit} limit
                </Typography>
                {subscription?.usage.users.limit !== -1 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(subscription?.usage.users.current, subscription?.usage.users.limit)}
                    color={getUsageColor(getUsagePercentage(subscription?.usage.users.current, subscription?.usage.users.limit))}
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <Inventory />
                  </Avatar>
                  <Typography variant="h6">Products</Typography>
                </Box>
                <Typography variant="h4" color="secondary">
                  {subscription?.usage.products.current || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {subscription?.usage.products.limit === -1 ? '∞' : subscription?.usage.products.limit?.toLocaleString()} limit
                </Typography>
                {subscription?.usage.products.limit !== -1 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(subscription?.usage.products.current, subscription?.usage.products.limit)}
                    color={getUsageColor(getUsagePercentage(subscription?.usage.products.current, subscription?.usage.products.limit))}
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <Business />
                  </Avatar>
                  <Typography variant="h6">Branches</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {subscription?.usage.branches.current || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {subscription?.usage.branches.limit === -1 ? '∞' : subscription?.usage.branches.limit} limit
                </Typography>
                {subscription?.usage.branches.limit !== -1 && (
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(subscription?.usage.branches.current, subscription?.usage.branches.limit)}
                    color={getUsageColor(getUsagePercentage(subscription?.usage.branches.current, subscription?.usage.branches.limit))}
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <Storage />
                  </Avatar>
                  <Typography variant="h6">Storage</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {subscription?.usage.storage.current || 0}GB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {subscription?.usage.storage.limit || 0}GB limit
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage(subscription?.usage.storage.current, subscription?.usage.storage.limit)}
                  color={getUsageColor(getUsagePercentage(subscription?.usage.storage.current, subscription?.usage.storage.limit))}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Add-ons */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader 
                title="Current Add-ons"
                action={
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setAddOnDialog(true)}
                  >
                    Add Add-on
                  </Button>
                }
              />
              <CardContent>
                {subscription?.addOns?.length > 0 ? (
                  <List>
                    {subscription.addOns.map((addon, index) => (
                      <ListItem key={addon.type} divider={index < subscription.addOns.length - 1}>
                        <ListItemText
                          primary={addon.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          secondary={`Quantity: ${addon.quantity} • ${formatCurrency(addon.totalPrice)}/month`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            color="error"
                            disabled={actionLoading === `remove-${addon.type}`}
                            onClick={() => handleRemoveAddOn(addon.type)}
                          >
                            {actionLoading === `remove-${addon.type}` ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Remove />
                            )}
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    No add-ons currently active. Click "Add Add-on" to enhance your plan.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Available Add-ons" />
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2">Extra Users</Typography>
                    <Typography variant="body2" color="text.secondary">
                      $3.00/user/month
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Extra SKUs</Typography>
                    <Typography variant="body2" color="text.secondary">
                      $5.00/1000 SKUs/month
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Extra Branch</Typography>
                    <Typography variant="body2" color="text.secondary">
                      $29.00/branch/month
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">Premium Support</Typography>
                    <Typography variant="body2" color="text.secondary">
                      $49.00/month
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Billing History */}
        <Card>
          <CardHeader title="Billing History" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billingHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status.toUpperCase()}
                          color={item.status === 'paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {item.invoiceUrl && (
                          <Button size="small" href={item.invoiceUrl} target="_blank">
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog} onClose={() => setChangePlanDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Change Subscription Plan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {plans.map((plan) => (
              <Grid item xs={12} sm={6} key={plan.id}>
                <Card 
                  variant={selectedPlan?.id === plan.id ? "elevation" : "outlined"}
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedPlan?.id === plan.id ? 2 : 1,
                    borderColor: selectedPlan?.id === plan.id ? 'primary.main' : 'divider'
                  }}
                  onClick={() => setSelectedPlan({ ...plan, billingPeriod: 'monthly' })}
                >
                  <CardContent>
                    <Typography variant="h6">{plan.name}</Typography>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(plan.monthlyPrice)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      per month
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      • {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users
                    </Typography>
                    <Typography variant="body2">
                      • {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePlanDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleChangePlan} 
            variant="contained"
            disabled={!selectedPlan || actionLoading === 'changePlan'}
          >
            {actionLoading === 'changePlan' ? <CircularProgress size={20} /> : 'Change Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Add-on Dialog */}
      <Dialog open={addOnDialog} onClose={() => setAddOnDialog(false)}>
        <DialogTitle>Add Add-on</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Add-on Type"
            value={selectedAddOn.type}
            onChange={(e) => setSelectedAddOn({ ...selectedAddOn, type: e.target.value })}
            SelectProps={{ native: true }}
            sx={{ mt: 2, mb: 2 }}
          >
            <option value="">Select add-on type</option>
            <option value="extraUser">Extra Users ($3/user/month)</option>
            <option value="extraSKUs">Extra SKUs ($5/1000 SKUs/month)</option>
            <option value="extraBranch">Extra Branch ($29/branch/month)</option>
            <option value="premiumSupport">Premium Support ($49/month)</option>
          </TextField>
          
          {selectedAddOn.type && selectedAddOn.type !== 'premiumSupport' && (
            <TextField
              type="number"
              fullWidth
              label="Quantity"
              value={selectedAddOn.quantity}
              onChange={(e) => setSelectedAddOn({ ...selectedAddOn, quantity: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOnDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddAddOn} 
            variant="contained"
            disabled={!selectedAddOn.type || actionLoading === 'addOn'}
          >
            {actionLoading === 'addOn' ? <CircularProgress size={20} /> : 'Add Add-on'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to cancel your subscription? This action cannot be undone.
          </Alert>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={cancelImmediate}
                onChange={(e) => setCancelImmediate(e.target.checked)}
              />
            }
            label="Cancel immediately (otherwise cancels at end of billing period)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Keep Subscription</Button>
          <Button 
            onClick={handleCancelSubscription} 
            variant="contained"
            color="error"
            disabled={actionLoading === 'cancel'}
          >
            {actionLoading === 'cancel' ? <CircularProgress size={20} /> : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionManagement;
