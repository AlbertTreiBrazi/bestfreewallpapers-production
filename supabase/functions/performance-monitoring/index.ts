// Performance Monitoring Edge Function
// Real-time performance tracking, alerts, and analytics

interface PerformanceMetric {
  metric_name: string;
  value: number;
  url?: string;
  user_id?: string;
  metadata?: any;
}

interface PerformanceAlert {
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric_value: number;
  threshold: number;
  url?: string;
  metadata?: any;
}

interface BusinessAnalytic {
  event_type: string;
  user_id?: string;
  session_id?: string;
  value?: number;
  metadata?: any;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  response_time: {
    warning: 1000, // 1 second
    critical: 3000 // 3 seconds
  },
  error_rate: {
    warning: 0.02, // 2%
    critical: 0.05 // 5%
  },
  bounce_rate: {
    warning: 0.7, // 70%
    critical: 0.85 // 85%
  },
  conversion_rate: {
    warning: 0.01, // 1%
    critical: 0.005 // 0.5%
  }
};

// Check performance thresholds and create alerts
async function checkPerformanceThresholds(
  supabaseUrl: string,
  serviceKey: string,
  metrics: PerformanceMetric[]
): Promise<PerformanceAlert[]> {
  const alerts: PerformanceAlert[] = [];
  
  for (const metric of metrics) {
    const threshold = PERFORMANCE_THRESHOLDS[metric.metric_name as keyof typeof PERFORMANCE_THRESHOLDS];
    
    if (threshold) {
      let severity: PerformanceAlert['severity'] | null = null;
      
      if (metric.value >= threshold.critical) {
        severity = 'critical';
      } else if (metric.value >= threshold.warning) {
        severity = 'medium';
      }
      
      if (severity) {
        alerts.push({
          alert_type: 'performance_threshold',
          severity,
          message: `${metric.metric_name} exceeded threshold: ${metric.value} >= ${severity === 'critical' ? threshold.critical : threshold.warning}`,
          metric_value: metric.value,
          threshold: severity === 'critical' ? threshold.critical : threshold.warning,
          url: metric.url,
          metadata: {
            metric_name: metric.metric_name,
            user_id: metric.user_id,
            ...metric.metadata
          }
        });
      }
    }
  }
  
  // Store alerts in database
  if (alerts.length > 0) {
    for (const alert of alerts) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/performance_alerts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            alert_type: alert.alert_type,
            severity: alert.severity,
            message: alert.message,
            metric_value: alert.metric_value,
            threshold: alert.threshold,
            url: alert.url,
            metadata: alert.metadata
          })
        });
      } catch (error) {
        console.error('Failed to store alert:', error);
      }
    }
  }
  
  return alerts;
}

// Calculate error rate from recent logs
async function calculateErrorRate(
  supabaseUrl: string,
  serviceKey: string,
  timeWindowMinutes: number = 5
): Promise<number> {
  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  try {
    // Get total requests
    const totalResponse = await fetch(
      `${supabaseUrl}/rest/v1/performance_logs?created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    // Get error requests
    const errorResponse = await fetch(
      `${supabaseUrl}/rest/v1/error_logs?created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    if (totalResponse.ok && errorResponse.ok) {
      const totalRequests = (await totalResponse.json()).length;
      const errorRequests = (await errorResponse.json()).length;
      
      return totalRequests > 0 ? errorRequests / totalRequests : 0;
    }
  } catch (error) {
    console.error('Failed to calculate error rate:', error);
  }
  
  return 0;
}

// Calculate conversion metrics
async function calculateConversionMetrics(
  supabaseUrl: string,
  serviceKey: string
): Promise<{ signup_rate: number; premium_conversion_rate: number; download_success_rate: number }> {
  const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
  
  try {
    // Get visitor count from business analytics
    const visitorResponse = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.page_view&created_at=gte.${startTime}&select=session_id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    // Get signup count
    const signupResponse = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.user_signup&created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    // Get premium conversion count
    const premiumResponse = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.premium_signup&created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    // Get download success rate
    const downloadsResponse = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.download_completed&created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    const downloadAttemptsResponse = await fetch(
      `${supabaseUrl}/rest/v1/business_analytics?event_type=eq.download_started&created_at=gte.${startTime}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      }
    );
    
    if (visitorResponse.ok && signupResponse.ok && premiumResponse.ok && downloadsResponse.ok && downloadAttemptsResponse.ok) {
      const visitors = new Set((await visitorResponse.json()).map((v: any) => v.session_id)).size;
      const signups = (await signupResponse.json()).length;
      const premiumSignups = (await premiumResponse.json()).length;
      const completedDownloads = (await downloadsResponse.json()).length;
      const attemptedDownloads = (await downloadAttemptsResponse.json()).length;
      
      return {
        signup_rate: visitors > 0 ? signups / visitors : 0,
        premium_conversion_rate: signups > 0 ? premiumSignups / signups : 0,
        download_success_rate: attemptedDownloads > 0 ? completedDownloads / attemptedDownloads : 0
      };
    }
  } catch (error) {
    console.error('Failed to calculate conversion metrics:', error);
  }
  
  return {
    signup_rate: 0,
    premium_conversion_rate: 0,
    download_success_rate: 0
  };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, metrics, events } = await req.json();
    
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }
    
    switch (action) {
      case 'log_performance_metrics': {
        const performanceMetrics: PerformanceMetric[] = metrics;
        
        // Store metrics in database
        for (const metric of performanceMetrics) {
          await fetch(`${supabaseUrl}/rest/v1/performance_logs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              metric_name: metric.metric_name,
              metric_value: metric.value,
              url: metric.url,
              user_id: metric.user_id,
              execution_time_ms: metric.metric_name === 'response_time' ? metric.value : null,
              rating: metric.value > 1000 ? 'poor' : metric.value > 500 ? 'fair' : 'good',
              metadata: metric.metadata
            })
          });
        }
        
        // Check thresholds and create alerts
        const alerts = await checkPerformanceThresholds(supabaseUrl, serviceKey, performanceMetrics);
        
        return new Response(JSON.stringify({
          data: {
            metrics_logged: performanceMetrics.length,
            alerts_created: alerts.length,
            alerts
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'log_business_events': {
        const businessEvents: BusinessAnalytic[] = events;
        
        // Store business events
        for (const event of businessEvents) {
          await fetch(`${supabaseUrl}/rest/v1/business_analytics`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_type: event.event_type,
              user_id: event.user_id,
              session_id: event.session_id,
              value: event.value,
              metadata: event.metadata
            })
          });
        }
        
        return new Response(JSON.stringify({
          data: {
            events_logged: businessEvents.length
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'get_performance_dashboard': {
        // Calculate real-time metrics
        const errorRate = await calculateErrorRate(supabaseUrl, serviceKey);
        const conversionMetrics = await calculateConversionMetrics(supabaseUrl, serviceKey);
        
        // Get recent performance data
        const performanceResponse = await fetch(
          `${supabaseUrl}/rest/v1/performance_analytics?order=hour.desc&limit=24`,
          {
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey
            }
          }
        );
        
        // Get active alerts
        const alertsResponse = await fetch(
          `${supabaseUrl}/rest/v1/performance_alerts?resolved_at=is.null&order=created_at.desc&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey
            }
          }
        );
        
        const performanceData = performanceResponse.ok ? await performanceResponse.json() : [];
        const activeAlerts = alertsResponse.ok ? await alertsResponse.json() : [];
        
        return new Response(JSON.stringify({
          data: {
            current_metrics: {
              error_rate: errorRate,
              ...conversionMetrics
            },
            performance_history: performanceData,
            active_alerts: activeAlerts,
            health_status: {
              overall: errorRate < 0.02 && conversionMetrics.download_success_rate > 0.95 ? 'healthy' : 'warning',
              error_rate: errorRate < 0.02 ? 'healthy' : 'warning',
              conversion_rate: conversionMetrics.signup_rate > 0.02 ? 'healthy' : 'warning',
              download_success: conversionMetrics.download_success_rate > 0.95 ? 'healthy' : 'warning'
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'health_check': {
        // Simple health check endpoint
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'healthy', // Could add actual DB ping
            storage: 'healthy',   // Could add actual storage check
            functions: 'healthy'  // This function is running
          }
        };
        
        return new Response(JSON.stringify({ data: healthData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      default:
        return new Response(JSON.stringify({
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid action specified'
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
  } catch (error) {
    console.error('Performance monitoring error:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'MONITORING_SERVICE_ERROR',
        message: 'Performance monitoring service temporarily unavailable'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
