# OPA Policies for Modern DevOps Demo
# Advanced security policies for Kubernetes and application security

# Package for Kubernetes admission control
package kubernetes.admission

# Deny privileged containers
deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.containers[_].securityContext.privileged == true
    msg := "Privileged containers are not allowed"
}

# Require non-root user
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext.runAsNonRoot
    msg := "Containers must run as non-root user"
}

# Require resource limits
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := "Memory limits are required for all containers"
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.cpu
    msg := "CPU limits are required for all containers"
}

# Require resource requests
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.requests.memory
    msg := "Memory requests are required for all containers"
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.requests.cpu
    msg := "CPU requests are required for all containers"
}

# Require security context
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext
    msg := "Security context is required for all containers"
}

# Require read-only root filesystem
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := "Read-only root filesystem is required"
}

# Deny host network access
deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostNetwork == true
    msg := "Host network access is not allowed"
}

# Deny host PID access
deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostPID == true
    msg := "Host PID access is not allowed"
}

# Deny host IPC access
deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostIPC == true
    msg := "Host IPC access is not allowed"
}

# Require specific labels
deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.metadata.labels.app
    msg := "App label is required"
}

deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.metadata.labels.version
    msg := "Version label is required"
}

# Require specific annotations
deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.metadata.annotations["prometheus.io/scrape"]
    msg := "Prometheus scrape annotation is required"
}

# Network policy enforcement
deny[msg] {
    input.request.kind.kind == "Pod"
    namespace := input.request.object.metadata.namespace
    not has_network_policy[namespace]
    msg := sprintf("Network policy is required for namespace: %s", [namespace])
}

has_network_policy[namespace] {
    input.request.kind.kind == "NetworkPolicy"
    input.request.object.metadata.namespace == namespace
}

# Image policy - only allow specific registries
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not startswith(container.image, "localhost:5000/")
    not startswith(container.image, "gcr.io/")
    not startswith(container.image, "docker.io/")
    msg := sprintf("Image %s is not from allowed registry", [container.image])
}

# Require specific image tags (no latest)
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    endswith(container.image, ":latest")
    msg := "Using 'latest' tag is not allowed"
}

# Service account policy
deny[msg] {
    input.request.kind.kind == "Pod"
    not input.request.object.spec.serviceAccountName
    msg := "Service account is required"
}

# Require specific service account naming
deny[msg] {
    input.request.kind.kind == "Pod"
    sa := input.request.object.spec.serviceAccountName
    not endswith(sa, "-sa")
    msg := "Service account name must end with '-sa'"
}
