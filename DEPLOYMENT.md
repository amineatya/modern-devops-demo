# 🚀 Deployment Guide

## Prerequisites

Before deploying the CI/CD Demo application, ensure you have the following tools installed:

- **Node.js** 18+ with npm 8+
- **Docker** 20+ with BuildKit support
- **Kubernetes** 1.24+ with kubectl configured
- **Helm** 3.8+ for package management
- **Terraform** 1.0+ for infrastructure
- **Jenkins** 2.400+ with required plugins
- **ArgoCD** 2.5+ for GitOps (optional)

## Deployment Options

### Option 1: Local Development

1. **Clone and Setup**
   ```bash
   git clone https://github.com/amineatya/cicd-demo.git
   cd cicd-demo
   npm install
   ```

2. **Run Tests**
   ```bash
   npm run test:ci
   ```

3. **Start Application**
   ```bash
   npm run dev
   ```

4. **Test Endpoints**
   ```bash
   curl http://localhost:3000/healthz
   curl http://localhost:3000/metrics
   curl http://localhost:3000/api-docs
   ```

### Option 2: Docker Deployment

1. **Build Image**
   ```bash
   docker build -t cicd-demo:latest .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 cicd-demo:latest
   ```

3. **Test Health**
   ```bash
   curl http://localhost:3000/healthz
   ```

### Option 3: Kubernetes Deployment

1. **Create Namespace**
   ```bash
   kubectl create namespace demo
   ```

2. **Apply Manifests**
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify Deployment**
   ```bash
   kubectl get pods -n demo
   kubectl get svc -n demo
   ```

4. **Test Application**
   ```bash
   kubectl port-forward svc/cicd-demo 8080:80 -n demo
   curl http://localhost:8080/healthz
   ```

### Option 4: Infrastructure as Code (Terraform)

1. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan Infrastructure**
   ```bash
   terraform plan
   ```

3. **Apply Infrastructure**
   ```bash
   terraform apply
   ```

4. **Get Outputs**
   ```bash
   terraform output
   ```

### Option 5: GitOps Deployment (ArgoCD)

1. **Install ArgoCD**
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```

2. **Create Application**
   ```bash
   kubectl apply -f gitops/application.yaml
   ```

3. **Sync Application**
   ```bash
   argocd app sync cicd-demo-app
   ```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `REDIS_URL` | - | Redis connection URL |
| `MONGODB_URI` | - | MongoDB connection string |
| `JWT_SECRET` | - | JWT signing secret |

### Kubernetes Configuration

The application is configured with:

- **Namespace**: `demo`
- **Replicas**: 3 (with rolling updates)
- **Resources**: 256Mi-1Gi memory, 200m-1000m CPU
- **Health Checks**: Liveness, readiness, and startup probes
- **Security**: Non-root user, read-only filesystem

## Monitoring Setup

### Prometheus & Grafana

1. **Deploy Monitoring Stack**
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
   ```

2. **Access Grafana**
   ```bash
   kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
   # Login: admin/prom-operator
   ```

3. **Import Dashboards**
   - Import Node.js application dashboard
   - Configure Prometheus data source
   - Set up alerting rules

### Health Monitoring

1. **Health Check Endpoint**
   ```bash
   curl http://localhost:3000/healthz
   ```

2. **Metrics Endpoint**
   ```bash
   curl http://localhost:3000/metrics
   ```

3. **API Documentation**
   ```bash
   curl http://localhost:3000/api-docs
   ```

## Troubleshooting

### Common Issues

1. **Pod Not Starting**
   ```bash
   kubectl describe pod -n demo -l app=cicd-demo
   kubectl logs -n demo -l app=cicd-demo
   ```

2. **Health Check Failing**
   ```bash
   kubectl get pods -n demo -l app=cicd-demo
   kubectl port-forward -n demo service/cicd-demo 8080:80
   curl http://localhost:8080/healthz
   ```

3. **Image Pull Errors**
   ```bash
   kubectl get events -n demo --sort-by='.lastTimestamp'
   ```

### Debug Commands

```bash
# Check pod status
kubectl get pods -n demo -l app=cicd-demo -o wide

# Check service endpoints
kubectl get endpoints -n demo -l app=cicd-demo

# Check secrets
kubectl get secrets -n demo

# Check configmaps
kubectl get configmaps -n demo

# Check network policies
kubectl get networkpolicies -n demo
```

## Security Considerations

### Container Security
- Verify non-root user execution
- Check read-only filesystem
- Validate security contexts
- Review network policies

### Secret Management
- Use Kubernetes secrets for sensitive data
- Rotate secrets regularly
- Encrypt secrets at rest
- Limit secret access

### Network Security
- Apply network policies
- Use service mesh if needed
- Enable TLS termination
- Monitor network traffic

## Performance Tuning

### Resource Optimization
- Set appropriate CPU/memory limits
- Configure horizontal pod autoscaler
- Optimize container images
- Use resource quotas

### Application Optimization
- Enable response compression
- Configure caching strategies
- Optimize database queries
- Use connection pooling

## Backup and Recovery

### Data Backup
- Backup MongoDB data
- Backup Redis data
- Backup configuration files
- Backup infrastructure state

### Disaster Recovery
- Test backup restoration
- Document recovery procedures
- Maintain runbooks
- Regular disaster recovery drills
