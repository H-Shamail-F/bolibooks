import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import BusinessIcon from '@mui/icons-material/Business';
import EnterpriseIcon from '@mui/icons-material/Business';

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [addOnPricing, setAddOnPricing] = useState({});
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getPlans();
      if (response.success) {
        setPlans(response.data.plans);
        setAddOnPricing(response.data.addOnPricing);
      } else {
        setError('Failed to load pricing plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (!user) {
      navigate('/register');
      return;
    }
    
    // Navigate to subscription management with selected plan
    navigate('/settings/subscription', { 
      state: { 
        selectedPlan: plan.id,
        billingPeriod: yearlyBilling ? 'yearly' : 'monthly'
      }
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getPlanIcon = (tier) => {
    switch (tier) {
      case 'starter': return <StarIcon color="primary" />;
      case 'growth': return <BusinessIcon color="primary" />;
      case 'business': return <BusinessIcon color="secondary" />;
      case 'enterprise': return <EnterpriseIcon color="error" />;
      default: return <StarIcon />;
    }
  };

  const getPlanColor = (tier) => {
    switch (tier) {
      case 'starter': return 'primary';
      case 'growth': return 'secondary';
      case 'business': return 'warning';
      case 'enterprise': return 'error';
      default: return 'primary';
    }
  };

  const getFeatureList = (features) => {
    const featureLabels = {
      unlimited_invoices: 'Unlimited Invoices',
      multiple_users: 'Multiple Users',
      pos: 'Point of Sale (POS)',
      inventory_management: 'Inventory Management',
      advanced_reporting: 'Advanced Reporting',
      api_access: 'API Access',
      custom_templates: 'Custom Templates',
      bulk_operations: 'Bulk Operations',
      multi_currency: 'Multi-Currency Support',
      customer_portal: 'Customer Portal',
      white_labeling: 'White Labeling',
      priority_support: 'Priority Support',
      advanced_integrations: 'Advanced Integrations'
    };

    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => featureLabels[key] || key);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h2" component="h1" gutterBottom>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" mb={4}>
          Start your free trial or upgrade to unlock more features
        </Typography>
        
        {/* Billing Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={yearlyBilling}
              onChange={(e) => setYearlyBilling(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography>Monthly</Typography>
              <Chip 
                label="Save up to 20%" 
                size="small" 
                color="success" 
                variant={yearlyBilling ? "filled" : "outlined"}
              />
              <Typography>Yearly</Typography>
            </Box>
          }
          sx={{ mb: 4 }}
        />
      </Box>

      {/* Pricing Plans */}
      <Grid container spacing={3} justifyContent="center">
        {plans.map((plan) => {
          const price = yearlyBilling ? plan.effectiveMonthlyPrice : plan.monthlyPrice;
          const totalPrice = yearlyBilling ? plan.yearlyPrice : plan.monthlyPrice;
          const savings = yearlyBilling ? plan.yearlySavings : 0;
          
          return (
            <Grid item xs={12} sm={6} lg={3} key={plan.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: plan.planTier === 'growth' ? 2 : 1,
                  borderColor: plan.planTier === 'growth' ? 'primary.main' : 'divider',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s'
                  }
                }}
              >
                {plan.planTier === 'growth' && (
                  <Chip
                    label="Most Popular"
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  {/* Plan Header */}
                  <Box textAlign="center" mb={2}>
                    {getPlanIcon(plan.planTier)}
                    <Typography variant="h5" component="h3" mt={1}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {plan.description}
                    </Typography>
                  </Box>

                  {/* Pricing */}
                  <Box textAlign="center" mb={3}>
                    <Typography variant="h3" color="primary">
                      {formatPrice(price)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      per month{yearlyBilling && totalPrice > 0 ? ', billed yearly' : ''}
                    </Typography>
                    
                    {yearlyBilling && savings > 0 && (
                      <Typography variant="body2" color="success.main" mt={1}>
                        Save {formatPrice(savings)} per year
                      </Typography>
                    )}
                  </Box>

                  {/* Limits */}
                  <Stack spacing={1} mb={3}>
                    <Typography variant="body2" color="text.secondary">
                      • {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {plan.maxProducts === -1 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products/SKUs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {plan.maxBranches === -1 ? 'Unlimited' : plan.maxBranches} Branch{plan.maxBranches !== 1 ? 'es' : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {plan.maxStorageGB}GB Storage
                    </Typography>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  {/* Features */}
                  <List dense>
                    {getFeatureList(plan.features).map((feature, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={plan.planTier === 'growth' ? 'contained' : 'outlined'}
                    color={getPlanColor(plan.planTier)}
                    size="large"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {user ? 'Select Plan' : 'Start Free Trial'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Add-ons Section */}
      <Box mt={8} textAlign="center">
        <Typography variant="h4" gutterBottom>
          Add-ons
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Extend your plan with additional features
        </Typography>
        
        <Grid container spacing={3} justifyContent="center" maxWidth="md" mx="auto">
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Extra Users</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Add more team members to your account
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatPrice(addOnPricing.extraUser || 3)}<Typography component="span" variant="body2">/user/month</Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Extra SKUs</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Manage more products in your inventory
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatPrice(addOnPricing.extraThousandSKUs || 5)}<Typography component="span" variant="body2">/1000 SKUs/month</Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Extra Branch</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Expand to additional business locations
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatPrice(addOnPricing.extraBranch || 29)}<Typography component="span" variant="body2">/branch/month</Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Premium Support</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Get priority email and phone support
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatPrice(addOnPricing.premiumSupport || 49)}<Typography component="span" variant="body2">/month</Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* CTA Section */}
      <Box textAlign="center" mt={8} py={4} sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Ready to get started?
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          Join thousands of businesses managing their finances with BoliBooks
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate(user ? '/settings/subscription' : '/register')}
          >
            {user ? 'Manage Subscription' : 'Start Free Trial'}
          </Button>
          <Button variant="outlined" size="large">
            Contact Sales
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default Pricing;
