const k8s = require('@kubernetes/client-node');
const promClient = require('prom-client');

class CostOptimizationManager {
  constructor() {
    this.k8sApi = k8s.KubeConfig.defaultClient();
    this.metrics = {
      costSavings: 0,
      resourcesOptimized: 0,
      recommendations: []
    };
  }

  // Analyze resource utilization and provide optimization recommendations
  async analyzeResourceUtilization(namespace = 'demo') {
    console.log(`🔍 Analyzing resource utilization in namespace: ${namespace}`);
    
    try {
      const pods = await this.k8sApi.listNamespacedPod(namespace);
      const nodes = await this.k8sApi.listNode();
      
      const analysis = {
        namespace,
        timestamp: new Date().toISOString(),
        pods: [],
        nodes: [],
        recommendations: []
      };

      // Analyze each pod
      for (const pod of pods.body.items) {
        const podAnalysis = await this.analyzePod(pod);
        analysis.pods.push(podAnalysis);
        
        if (podAnalysis.optimization) {
          analysis.recommendations.push(podAnalysis.optimization);
        }
      }

      // Analyze node utilization
      for (const node of nodes.body.items) {
        const nodeAnalysis = await this.analyzeNode(node);
        analysis.nodes.push(nodeAnalysis);
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing resource utilization:', error);
      throw error;
    }
  }

  // Analyze individual pod resource usage
  async analyzePod(pod) {
    const podName = pod.metadata.name;
    const containers = pod.spec.containers;
    
    const analysis = {
      name: podName,
      namespace: pod.metadata.namespace,
      containers: [],
      optimization: null
    };

    for (const container of containers) {
      const containerAnalysis = {
        name: container.name,
        requests: container.resources?.requests || {},
        limits: container.resources?.limits || {},
        recommendations: []
      };

      // Check for missing resource requests
      if (!container.resources?.requests) {
        containerAnalysis.recommendations.push({
          type: 'missing_requests',
          severity: 'high',
          message: 'Resource requests are missing',
          recommendation: 'Add CPU and memory requests for better scheduling'
        });
      }

      // Check for missing resource limits
      if (!container.resources?.limits) {
        containerAnalysis.recommendations.push({
          type: 'missing_limits',
          severity: 'high',
          message: 'Resource limits are missing',
          recommendation: 'Add CPU and memory limits to prevent resource exhaustion'
        });
      }

      // Check for oversized requests
      if (container.resources?.requests) {
        const cpuRequest = this.parseResourceValue(container.resources.requests.cpu);
        const memoryRequest = this.parseResourceValue(container.resources.requests.memory);
        
        if (cpuRequest > 1000) { // More than 1 CPU
          containerAnalysis.recommendations.push({
            type: 'oversized_cpu_request',
            severity: 'medium',
            message: 'CPU request seems oversized',
            recommendation: 'Consider reducing CPU request to optimize resource allocation'
          });
        }

        if (memoryRequest > 1024 * 1024 * 1024) { // More than 1GB
          containerAnalysis.recommendations.push({
            type: 'oversized_memory_request',
            severity: 'medium',
            message: 'Memory request seems oversized',
            recommendation: 'Consider reducing memory request to optimize resource allocation'
          });
        }
      }

      analysis.containers.push(containerAnalysis);
    }

    // Generate pod-level optimization
    if (analysis.containers.some(c => c.recommendations.length > 0)) {
      analysis.optimization = {
        type: 'pod_optimization',
        priority: 'high',
        estimatedSavings: this.calculatePodSavings(analysis),
        actions: this.generatePodActions(analysis)
      };
    }

    return analysis;
  }

  // Analyze node resource utilization
  async analyzeNode(node) {
    const nodeName = node.metadata.name;
    const capacity = node.status.capacity;
    const allocatable = node.status.allocatable;
    
    return {
      name: nodeName,
      capacity: {
        cpu: capacity.cpu,
        memory: capacity.memory,
        pods: capacity.pods
      },
      allocatable: {
        cpu: allocatable.cpu,
        memory: allocatable.memory,
        pods: allocatable.pods
      },
      utilization: await this.getNodeUtilization(nodeName),
      recommendations: this.generateNodeRecommendations(node)
    };
  }

  // Generate cost optimization recommendations
  async generateCostOptimizations(namespace = 'demo') {
    console.log(`💰 Generating cost optimization recommendations for ${namespace}`);
    
    const analysis = await this.analyzeResourceUtilization(namespace);
    const optimizations = [];

    // Right-sizing recommendations
    const rightSizingRecs = this.generateRightSizingRecommendations(analysis);
    optimizations.push(...rightSizingRecs);

    // Auto-scaling recommendations
    const autoScalingRecs = this.generateAutoScalingRecommendations(analysis);
    optimizations.push(...autoScalingRecs);

    // Resource sharing recommendations
    const sharingRecs = this.generateResourceSharingRecommendations(analysis);
    optimizations.push(...sharingRecs);

    // Spot instance recommendations
    const spotRecs = this.generateSpotInstanceRecommendations(analysis);
    optimizations.push(...spotRecs);

    return {
      namespace,
      timestamp: new Date().toISOString(),
      totalPotentialSavings: this.calculateTotalSavings(optimizations),
      optimizations: optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings)
    };
  }

  // Generate right-sizing recommendations
  generateRightSizingRecommendations(analysis) {
    const recommendations = [];

    for (const pod of analysis.pods) {
      for (const container of pod.containers) {
        if (container.recommendations.length > 0) {
          recommendations.push({
            type: 'right_sizing',
            priority: 'high',
            pod: pod.name,
            container: container.name,
            potentialSavings: this.calculateContainerSavings(container),
            actions: [
              'Review actual resource usage metrics',
              'Adjust CPU and memory requests based on usage',
              'Set appropriate resource limits',
              'Monitor performance after changes'
            ]
          });
        }
      }
    }

    return recommendations;
  }

  // Generate auto-scaling recommendations
  generateAutoScalingRecommendations(analysis) {
    const recommendations = [];

    // Check for deployments without HPA
    const deploymentsWithoutHPA = analysis.pods.filter(pod => 
      pod.metadata.labels.app && !pod.metadata.annotations['autoscaling/enabled']
    );

    for (const pod of deploymentsWithoutHPA) {
      recommendations.push({
        type: 'horizontal_pod_autoscaler',
        priority: 'medium',
        pod: pod.name,
        potentialSavings: this.calculateAutoScalingSavings(pod),
        actions: [
          'Create HorizontalPodAutoscaler resource',
          'Set appropriate CPU and memory thresholds',
          'Configure min and max replicas',
          'Monitor scaling behavior'
        ]
      });
    }

    return recommendations;
  }

  // Generate resource sharing recommendations
  generateResourceSharingRecommendations(analysis) {
    const recommendations = [];

    // Identify pods that could share resources
    const lowUtilizationPods = analysis.pods.filter(pod => 
      this.isLowUtilization(pod)
    );

    if (lowUtilizationPods.length > 1) {
      recommendations.push({
        type: 'resource_sharing',
        priority: 'low',
        pods: lowUtilizationPods.map(p => p.name),
        potentialSavings: this.calculateSharingSavings(lowUtilizationPods),
        actions: [
          'Consider consolidating low-utilization pods',
          'Use resource quotas to limit resource usage',
          'Implement resource sharing strategies',
          'Monitor resource contention'
        ]
      });
    }

    return recommendations;
  }

  // Generate spot instance recommendations
  generateSpotInstanceRecommendations(analysis) {
    const recommendations = [];

    // Identify workloads suitable for spot instances
    const spotSuitablePods = analysis.pods.filter(pod => 
      this.isSpotSuitable(pod)
    );

    if (spotSuitablePods.length > 0) {
      recommendations.push({
        type: 'spot_instances',
        priority: 'medium',
        pods: spotSuitablePods.map(p => p.name),
        potentialSavings: this.calculateSpotSavings(spotSuitablePods),
        actions: [
          'Configure node affinity for spot instances',
          'Implement pod disruption budgets',
          'Set up multi-AZ deployment',
          'Monitor spot instance availability'
        ]
      });
    }

    return recommendations;
  }

  // Helper methods
  parseResourceValue(value) {
    if (!value) return 0;
    
    const unit = value.slice(-1);
    const number = parseFloat(value.slice(0, -1));
    
    switch (unit) {
      case 'm': return number; // millicores
      case 'G': return number * 1024 * 1024 * 1024; // gigabytes
      case 'M': return number * 1024 * 1024; // megabytes
      case 'K': return number * 1024; // kilobytes
      default: return number;
    }
  }

  calculatePodSavings(analysis) {
    // Simplified calculation - in real implementation, use actual metrics
    return analysis.containers.length * 10; // $10 per container optimization
  }

  calculateContainerSavings(container) {
    return container.recommendations.length * 5; // $5 per recommendation
  }

  calculateAutoScalingSavings(pod) {
    return 20; // $20 per HPA implementation
  }

  calculateSharingSavings(pods) {
    return pods.length * 15; // $15 per pod consolidation
  }

  calculateSpotSavings(pods) {
    return pods.length * 30; // $30 per pod on spot instances
  }

  calculateTotalSavings(optimizations) {
    return optimizations.reduce((total, opt) => total + opt.potentialSavings, 0);
  }

  isLowUtilization(pod) {
    // Simplified check - in real implementation, use actual metrics
    return pod.containers.every(c => c.recommendations.length > 0);
  }

  isSpotSuitable(pod) {
    // Check if pod is suitable for spot instances (stateless, fault-tolerant)
    const labels = pod.metadata.labels || {};
    return labels['workload-type'] === 'stateless' || 
           labels['fault-tolerant'] === 'true';
  }

  generatePodActions(analysis) {
    return [
      'Review resource requests and limits',
      'Monitor actual resource usage',
      'Adjust resources based on metrics',
      'Test performance after changes'
    ];
  }

  generateNodeRecommendations(node) {
    const recommendations = [];
    
    // Check node utilization
    const utilization = this.getNodeUtilization(node.metadata.name);
    if (utilization.cpu > 80) {
      recommendations.push({
        type: 'high_cpu_utilization',
        message: 'Node CPU utilization is high',
        recommendation: 'Consider adding more nodes or optimizing workloads'
      });
    }

    if (utilization.memory > 80) {
      recommendations.push({
        type: 'high_memory_utilization',
        message: 'Node memory utilization is high',
        recommendation: 'Consider adding more nodes or optimizing memory usage'
      });
    }

    return recommendations;
  }

  async getNodeUtilization(nodeName) {
    // Simplified - in real implementation, query metrics API
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100
    };
  }

  // Get optimization metrics
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CostOptimizationManager;
