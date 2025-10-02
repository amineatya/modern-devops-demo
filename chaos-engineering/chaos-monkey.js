const ChaosMonkey = require('chaos-monkey');
const axios = require('axios');

class AdvancedChaosEngineering {
  constructor() {
    this.chaosMonkey = new ChaosMonkey();
    this.scenarios = new Map();
    this.metrics = {
      failures: 0,
      recoveries: 0,
      testsRun: 0
    };
  }

  // Network chaos scenarios
  async simulateNetworkLatency(target, latencyMs = 1000) {
    const scenario = {
      name: 'network-latency',
      target: target,
      type: 'latency',
      duration: latencyMs,
      probability: 0.1
    };
    
    this.scenarios.set(scenario.name, scenario);
    console.log(`🌐 Simulating ${latencyMs}ms network latency to ${target}`);
    
    try {
      const start = Date.now();
      await axios.get(target, { timeout: latencyMs + 1000 });
      const actualLatency = Date.now() - start;
      
      this.metrics.testsRun++;
      return { success: true, actualLatency, expectedLatency: latencyMs };
    } catch (error) {
      this.metrics.failures++;
      return { success: false, error: error.message };
    }
  }

  // Service failure simulation
  async simulateServiceFailure(serviceUrl, failureRate = 0.5) {
    const scenario = {
      name: 'service-failure',
      target: serviceUrl,
      type: 'failure',
      failureRate: failureRate,
      duration: 30000 // 30 seconds
    };
    
    this.scenarios.set(scenario.name, scenario);
    console.log(`💥 Simulating ${failureRate * 100}% failure rate for ${serviceUrl}`);
    
    const results = [];
    for (let i = 0; i < 10; i++) {
      try {
        const response = await axios.get(serviceUrl);
        results.push({ attempt: i + 1, success: true, status: response.status });
      } catch (error) {
        results.push({ attempt: i + 1, success: false, error: error.message });
        this.metrics.failures++;
      }
    }
    
    this.metrics.testsRun += 10;
    return results;
  }

  // Database connection chaos
  async simulateDatabaseChaos(dbConfig) {
    const scenario = {
      name: 'database-chaos',
      type: 'database',
      config: dbConfig,
      duration: 60000 // 1 minute
    };
    
    this.scenarios.set(scenario.name, scenario);
    console.log(`🗄️ Simulating database connection chaos`);
    
    const chaosTests = [
      { name: 'connection-timeout', timeout: 1000 },
      { name: 'connection-refused', simulate: 'ECONNREFUSED' },
      { name: 'query-timeout', timeout: 5000 },
      { name: 'connection-limit', simulate: 'EMFILE' }
    ];
    
    const results = [];
    for (const test of chaosTests) {
      try {
        // Simulate different database failure scenarios
        const result = await this.simulateDatabaseFailure(test);
        results.push(result);
      } catch (error) {
        results.push({ test: test.name, success: false, error: error.message });
        this.metrics.failures++;
      }
    }
    
    this.metrics.testsRun += chaosTests.length;
    return results;
  }

  // Memory pressure simulation
  async simulateMemoryPressure(durationMs = 30000) {
    const scenario = {
      name: 'memory-pressure',
      type: 'memory',
      duration: durationMs
    };
    
    this.scenarios.set(scenario.name, scenario);
    console.log(`🧠 Simulating memory pressure for ${durationMs}ms`);
    
    const memoryArrays = [];
    const startTime = Date.now();
    
    try {
      // Allocate memory to create pressure
      while (Date.now() - startTime < durationMs) {
        const array = new Array(1000000).fill('chaos-test-data');
        memoryArrays.push(array);
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > memUsage.heapTotal * 0.8) {
          console.log('⚠️ High memory usage detected, stopping allocation');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clean up
      memoryArrays.length = 0;
      if (global.gc) global.gc(); // Force garbage collection if available
      
      this.metrics.testsRun++;
      return { success: true, duration: Date.now() - startTime };
    } catch (error) {
      this.metrics.failures++;
      return { success: false, error: error.message };
    }
  }

  // CPU stress simulation
  async simulateCPUStress(durationMs = 30000) {
    const scenario = {
      name: 'cpu-stress',
      type: 'cpu',
      duration: durationMs
    };
    
    this.scenarios.set(scenario.name, scenario);
    console.log(`⚡ Simulating CPU stress for ${durationMs}ms`);
    
    const startTime = Date.now();
    const workers = [];
    
    try {
      // Create CPU-intensive tasks
      for (let i = 0; i < 4; i++) {
        workers.push(this.cpuIntensiveTask(durationMs));
      }
      
      await Promise.all(workers);
      
      this.metrics.testsRun++;
      return { success: true, duration: Date.now() - startTime };
    } catch (error) {
      this.metrics.failures++;
      return { success: false, error: error.message };
    }
  }

  // Chaos monkey for random failures
  async randomChaos(targets) {
    const chaosTypes = [
      'network-latency',
      'service-failure',
      'memory-pressure',
      'cpu-stress'
    ];
    
    const randomType = chaosTypes[Math.floor(Math.random() * chaosTypes.length)];
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    
    console.log(`🐒 Random chaos: ${randomType} on ${randomTarget}`);
    
    switch (randomType) {
      case 'network-latency':
        return await this.simulateNetworkLatency(randomTarget, Math.random() * 2000);
      case 'service-failure':
        return await this.simulateServiceFailure(randomTarget, Math.random());
      case 'memory-pressure':
        return await this.simulateMemoryPressure(Math.random() * 30000);
      case 'cpu-stress':
        return await this.simulateCPUStress(Math.random() * 30000);
      default:
        return { success: false, error: 'Unknown chaos type' };
    }
  }

  // Resilience testing
  async testResilience(endpoints) {
    console.log('🛡️ Starting resilience testing');
    
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      scenarios: []
    };
    
    for (const endpoint of endpoints) {
      // Test normal operation
      const normalTest = await this.testEndpointHealth(endpoint);
      results.totalTests++;
      if (normalTest.success) results.passedTests++;
      else results.failedTests++;
      
      // Test under chaos
      const chaosResult = await this.randomChaos([endpoint]);
      results.scenarios.push({
        endpoint,
        normalTest,
        chaosResult
      });
    }
    
    return results;
  }

  // Helper methods
  async simulateDatabaseFailure(test) {
    // Simulate database failure scenarios
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (test.simulate === 'ECONNREFUSED') {
          reject(new Error('ECONNREFUSED'));
        } else if (test.simulate === 'EMFILE') {
          reject(new Error('EMFILE'));
        } else {
          resolve({ test: test.name, success: true });
        }
      }, test.timeout || 1000);
    });
  }

  async cpuIntensiveTask(durationMs) {
    const startTime = Date.now();
    while (Date.now() - startTime < durationMs) {
      // CPU-intensive calculation
      Math.sqrt(Math.random() * 1000000);
    }
  }

  async testEndpointHealth(endpoint) {
    try {
      const response = await axios.get(endpoint, { timeout: 5000 });
      return { success: true, status: response.status, responseTime: response.headers['x-response-time'] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get chaos metrics
  getMetrics() {
    return {
      ...this.metrics,
      activeScenarios: this.scenarios.size,
      scenarios: Array.from(this.scenarios.values())
    };
  }

  // Clean up active scenarios
  cleanup() {
    this.scenarios.clear();
    console.log('🧹 Chaos engineering cleanup completed');
  }
}

module.exports = AdvancedChaosEngineering;
