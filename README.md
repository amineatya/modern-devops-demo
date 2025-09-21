# CI/CD Demo Application

A simple Node.js application designed to demonstrate a complete CI/CD pipeline with Jenkins, Kubernetes, and MinIO.

## 🚀 Features

- **Health Check Endpoint**: `/healthz` for monitoring
- **API Information**: Root endpoint with service details
- **Status Endpoint**: `/api/v1/status` with build information
- **Docker Support**: Multi-stage Dockerfile for production
- **Testing**: Jest unit tests with coverage
- **Linting**: ESLint for code quality
- **Security**: npm audit for vulnerability scanning

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Gitea    │───▶│   Jenkins   │───▶│ Kubernetes  │───▶│   MinIO     │
│  (Git Repo) │    │  (CI/CD)    │    │ (Deployment)│    │ (Artifacts) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 📋 Prerequisites

- Node.js 20+
- Docker
- kubectl
- Jenkins
- MinIO
- Gitea

## 🚀 Quick Start

### 1. Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Test health endpoint
curl http://localhost:3000/healthz
```

### 2. Docker

```bash
# Build image
docker build -t cicd-demo:latest .

# Run container
docker run -p 3000:3000 cicd-demo:latest

# Test health endpoint
curl http://localhost:3000/healthz
```

### 3. Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods -l app=cicd-demo
kubectl get svc cicd-demo

# Port forward for testing
kubectl port-forward svc/cicd-demo 8080:80
curl http://localhost:8080/healthz
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `BUILD_NUMBER` | `local` | Build number |
| `GIT_COMMIT` | `unknown` | Git commit hash |

### Jenkins Pipeline

The `Jenkinsfile` includes:

1. **Checkout**: Clone from Gitea
2. **Build**: Docker image with tags
3. **Test**: Unit tests, linting, security scan
4. **Push**: Upload to registry
5. **Upload**: Artifacts to MinIO
6. **Deploy**: To Kubernetes
7. **Smoke Test**: Health check verification

## 📊 API Endpoints

### Health Check
```bash
GET /healthz
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0",
  "environment": "production"
}
```

### API Information
```bash
GET /
```

**Response:**
```json
{
  "message": "CI/CD Demo Application",
  "version": "1.0.0",
  "description": "A simple application to demonstrate CI/CD pipeline",
  "endpoints": {
    "health": "/healthz",
    "api": "/api/v1"
  }
}
```

### Service Status
```bash
GET /api/v1/status
```

**Response:**
```json
{
  "service": "cicd-demo-app",
  "status": "running",
  "environment": "production",
  "build": "123",
  "commit": "abc123def456"
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:ci

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📦 Docker

### Build
```bash
docker build -t cicd-demo:latest .
```

### Run
```bash
docker run -p 3000:3000 cicd-demo:latest
```

### Health Check
```bash
curl http://localhost:3000/healthz
```

## ☸️ Kubernetes

### Deploy
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Check Status
```bash
kubectl get pods -l app=cicd-demo
kubectl get svc cicd-demo
```

### Logs
```bash
kubectl logs -f deployment/cicd-demo
```

## 🔄 CI/CD Pipeline

The Jenkins pipeline automatically:

1. **Triggers** on code push to Gitea
2. **Builds** Docker image with multiple tags
3. **Tests** code quality and security
4. **Deploys** to Kubernetes
5. **Verifies** deployment with smoke tests
6. **Reports** status back to Gitea

## 🛠️ Development

### Project Structure
```
cicd-demo/
├── src/
│   ├── app.js          # Main application
│   └── app.test.js     # Unit tests
├── k8s/
│   ├── deployment.yaml # Kubernetes deployment
│   └── service.yaml    # Kubernetes service
├── Dockerfile          # Docker configuration
├── Jenkinsfile         # CI/CD pipeline
├── package.json        # Dependencies
└── README.md           # Documentation
```

### Adding Features

1. Add new endpoints in `src/app.js`
2. Add tests in `src/app.test.js`
3. Update Dockerfile if needed
4. Update Kubernetes manifests if needed
5. Commit and push to trigger pipeline

## 📈 Monitoring

- **Health Check**: `/healthz` endpoint
- **Logs**: Kubernetes pod logs
- **Metrics**: Application metrics via `/api/v1/status`
- **Artifacts**: Stored in MinIO

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy CI/CD! 🚀**
