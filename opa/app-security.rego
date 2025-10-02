# OPA Policies for Application Security
# Advanced application-level security policies

package application.security

# API rate limiting policy
rate_limit_exceeded[msg] {
    request := input.request
    user_id := request.headers["x-user-id"]
    requests_count := count(requests_by_user[user_id])
    requests_count > 100
    msg := sprintf("Rate limit exceeded for user %s: %d requests", [user_id, requests_count])
}

# Data access policy
unauthorized_data_access[msg] {
    request := input.request
    user_role := request.headers["x-user-role"]
    resource := request.path
    not allowed_access[user_role][resource]
    msg := sprintf("User role %s not authorized to access %s", [user_role, resource])
}

# Data classification policy
sensitive_data_exposure[msg] {
    response := input.response
    data := response.body
    contains(data, "password")
    contains(data, "secret")
    contains(data, "token")
    msg := "Sensitive data detected in response"
}

# Input validation policy
invalid_input[msg] {
    request := input.request
    body := request.body
    contains(body, "<script>")
    msg := "Potential XSS attack detected"
}

invalid_input[msg] {
    request := input.request
    body := request.body
    contains(body, "DROP TABLE")
    msg := "Potential SQL injection detected"
}

# Authentication policy
unauthenticated_access[msg] {
    request := input.request
    not request.headers["authorization"]
    protected_endpoints := ["/api/v1/users", "/api/v1/admin", "/api/v1/sensitive"]
    request.path in protected_endpoints
    msg := "Authentication required for protected endpoint"
}

# Authorization policy
insufficient_permissions[msg] {
    request := input.request
    user_role := request.headers["x-user-role"]
    admin_endpoints := ["/api/v1/admin", "/api/v1/system"]
    request.path in admin_endpoints
    user_role != "admin"
    msg := "Admin role required for administrative endpoints"
}

# Data retention policy
data_retention_violation[msg] {
    request := input.request
    request.method == "GET"
    request.path == "/api/v1/logs"
    retention_days := 30
    request.query["days"] > retention_days
    msg := sprintf("Data retention policy violation: cannot access logs older than %d days", [retention_days])
}

# Audit logging policy
audit_log_required[msg] {
    request := input.request
    audit_endpoints := ["/api/v1/users", "/api/v1/admin", "/api/v1/sensitive"]
    request.path in audit_endpoints
    not request.headers["x-audit-id"]
    msg := "Audit logging required for sensitive operations"
}

# Geographic access policy
geographic_restriction[msg] {
    request := input.request
    country := request.headers["x-country-code"]
    restricted_countries := ["XX", "YY"] # Example restricted countries
    country in restricted_countries
    msg := sprintf("Access denied from country: %s", [country])
}

# Time-based access policy
time_restriction[msg] {
    request := input.request
    current_hour := time.clock(request.timestamp)[0]
    maintenance_hours := [2, 3, 4] # 2 AM to 4 AM
    current_hour in maintenance_hours
    request.path != "/healthz"
    msg := "Access restricted during maintenance hours"
}

# Resource usage policy
resource_limit_exceeded[msg] {
    request := input.request
    request.body_size > 10485760 # 10MB
    msg := "Request body size exceeds limit"
}

# API versioning policy
deprecated_api_usage[msg] {
    request := input.request
    startswith(request.path, "/api/v1/")
    request.headers["x-api-version"] == "v1"
    msg := "API v1 is deprecated, please use v2"
}

# Content type policy
invalid_content_type[msg] {
    request := input.request
    request.method == "POST"
    request.headers["content-type"] != "application/json"
    msg := "Content-Type must be application/json for POST requests"
}

# CORS policy
cors_violation[msg] {
    request := input.request
    origin := request.headers["origin"]
    allowed_origins := ["https://app.example.com", "https://admin.example.com"]
    not origin in allowed_origins
    msg := sprintf("CORS violation: origin %s not allowed", [origin])
}

# Helper functions
allowed_access = {
    "admin": ["/api/v1/users", "/api/v1/admin", "/api/v1/system", "/api/v1/logs"],
    "user": ["/api/v1/users", "/api/v1/profile"],
    "guest": ["/api/v1/public"]
}

requests_by_user = {
    user_id: count(requests) |
        requests := [req | req := input.requests[_]; req.headers["x-user-id"] == user_id]
}
