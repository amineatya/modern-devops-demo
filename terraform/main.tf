# Terraform configuration for CI/CD Demo Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.0"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# Create namespace
resource "kubernetes_namespace" "demo" {
  metadata {
    name = "demo"
    labels = {
      name        = "demo"
      environment = "production"
      project     = "cicd-demo"
    }
  }
}

# Create namespace for monitoring
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      name        = "monitoring"
      environment = "production"
      project     = "cicd-demo"
    }
  }
}

# Deploy Prometheus for monitoring
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "45.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          serviceMonitorSelectorNilUsesHelmValues = false
          ruleSelectorNilUsesHelmValues = false
        }
      }
      grafana = {
        enabled = true
        adminPassword = "admin123"
        service = {
          type = "NodePort"
          nodePort = 30000
        }
      }
    })
  ]
}

# Deploy Redis for caching
resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "17.0.0"
  namespace  = kubernetes_namespace.demo.metadata[0].name

  values = [
    yamlencode({
      auth = {
        enabled = false
      }
      master = {
        service = {
          type = "ClusterIP"
        }
      }
    })
  ]
}

# Deploy MongoDB
resource "helm_release" "mongodb" {
  name       = "mongodb"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "mongodb"
  version    = "13.0.0"
  namespace  = kubernetes_namespace.demo.metadata[0].name

  values = [
    yamlencode({
      auth = {
        enabled = false
      }
      service = {
        type = "ClusterIP"
      }
    })
  ]
}

# Create ConfigMap for application configuration
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "cicd-demo-config"
    namespace = kubernetes_namespace.demo.metadata[0].name
  }

  data = {
    NODE_ENV = "production"
    LOG_LEVEL = "info"
    REDIS_URL = "redis://redis-master:6379"
    MONGODB_URI = "mongodb://mongodb:27017/cicd-demo"
  }
}

# Create Secret for sensitive data
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "cicd-demo-secrets"
    namespace = kubernetes_namespace.demo.metadata[0].name
  }

  data = {
    jwt-secret = base64encode("super-secure-jwt-secret-key")
    redis-url = base64encode("redis://redis-master:6379")
    mongodb-uri = base64encode("mongodb://mongodb:27017/cicd-demo")
  }

  type = "Opaque"
}

# Output important information
output "namespace" {
  value = kubernetes_namespace.demo.metadata[0].name
}

output "prometheus_url" {
  value = "http://localhost:30000"
}

output "grafana_url" {
  value = "http://localhost:30000"
}

output "redis_url" {
  value = "redis://redis-master.demo.svc.cluster.local:6379"
}

output "mongodb_url" {
  value = "mongodb://mongodb.demo.svc.cluster.local:27017/cicd-demo"
}
