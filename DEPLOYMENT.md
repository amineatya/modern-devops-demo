# 🚀 Deployment Guide

## Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.8+
- Docker 20+
- Terraform 1.0+

## Quick Start

### 1. Infrastructure Setup
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Deploy Application
```bash
kubectl create namespace demo
kubectl apply -f k8s/
```

### 3. Verify Deployment
```bash
kubectl get pods -n demo
kubectl get svc -n demo
```

### 4. Access Application
```bash
kubectl port-forward svc/cicd-demo 8080:80 -n demo
curl http://localhost:8080/healthz
```

## Advanced Deployment

### Service Mesh (Istio)
```bash
kubectl apply -f istio/
```

### Monitoring Stack
```bash
helm install prometheus prometheus-community/kube-prometheus-stack
helm install grafana grafana/grafana
```

### Security Policies (OPA)
```bash
kubectl apply -f opa/
```

## Environment Configuration

### Development
- Single replica
- Debug logging enabled
- Local storage

### Staging
- 2 replicas
- Production-like configuration
- Shared storage

### Production
- 3+ replicas
- High availability
- Persistent storage
- Security hardening

## Monitoring Setup

### Prometheus Configuration
- Custom metrics collection
- Business KPI tracking
- Resource utilization monitoring

### Grafana Dashboards
- Application performance
- Infrastructure metrics
- Business metrics
- Cost optimization

### Alerting Rules
- Critical alerts for failures
- Warning alerts for performance
- Cost alerts for optimization

## Security Configuration

### Network Policies
- Pod-to-pod communication control
- Service isolation
- External access restrictions

### RBAC
- Service account permissions
- Role-based access control
- Least privilege principle

### Secrets Management
- Kubernetes secrets
- Encrypted storage
- Rotation policies

## Troubleshooting

### Common Issues
1. **Pod Not Starting**: Check resource limits and health probes
2. **Service Unavailable**: Verify network policies and service configuration
3. **High Resource Usage**: Review resource requests and limits
4. **Security Violations**: Check OPA policies and network restrictions

### Debug Commands
```bash
kubectl describe pod <pod-name> -n demo
kubectl logs <pod-name> -n demo
kubectl get events -n demo --sort-by='.lastTimestamp'
```

## Performance Tuning

### Resource Optimization
- Set appropriate CPU/memory requests
- Configure horizontal pod autoscaler
- Optimize container images
- Use resource quotas

### Scaling Configuration
- Horizontal Pod Autoscaler (HPA)
- Vertical Pod Autoscaler (VPA)
- Cluster Autoscaler
- Custom metrics scaling

## Backup & Recovery

### Data Backup
- MongoDB data backup
- Redis data backup
- Configuration backup
- Infrastructure state backup

### Disaster Recovery
- Multi-region deployment
- Automated failover
- Data replication
- Recovery procedures

## Cost Optimization

### Resource Management
- Right-size resources
- Use spot instances
- Implement auto-scaling
- Monitor costs

### Optimization Strategies
- Resource utilization analysis
- Cost allocation tracking
- Budget alerts
- Optimization recommendations