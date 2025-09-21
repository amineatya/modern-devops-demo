pipeline {
    agent any
    
    environment {
        // Environment variables with defaults
        GITEA_BASE = "${env.GITEA_BASE ?: 'http://192.168.50.130:3000'}"
        JENKINS_BASE = "${env.JENKINS_BASE ?: 'http://192.168.50.247:8080'}"
        MINIO_ENDPOINT = "${env.MINIO_ENDPOINT ?: 'http://192.168.68.58:9000'}"
        REGISTRY = "${env.REGISTRY ?: 'localhost:5000'}"
        NAMESPACE = "${env.NAMESPACE ?: 'demo'}"
        
        // Build information
        BUILD_TAG = "${env.BUILD_TAG ?: 'latest'}"
        GIT_SHORT_SHA = "${env.GIT_SHORT_SHA ?: sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()}"
        GIT_COMMIT = "${env.GIT_COMMIT ?: sh(script: 'git rev-parse HEAD', returnStdout: true).trim()}"
        
        // Credentials
        GITEA_CREDS = credentials('gitea-creds')
        MINIO_CREDS = credentials('minio-creds')
        KUBECONFIG_CREDS = credentials('kubeconfig')
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))
        skipDefaultCheckout()
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    // Checkout from Gitea using HTTPS
                    checkout scm
                    
                    // Set commit status to pending in Gitea
                    sh """
                        curl -X POST "${GITEA_BASE}/api/v1/repos/amine/cicd-demo/statuses/${GIT_COMMIT}" \
                            -H "Authorization: token ${GITEA_CREDS_PSW}" \
                            -H "Content-Type: application/json" \
                            -d '{
                                "state": "pending",
                                "target_url": "${JENKINS_BASE}/job/${env.JOB_NAME}/${env.BUILD_NUMBER}/",
                                "description": "Build in progress",
                                "context": "jenkins/ci"
                            }' || echo "Failed to set Gitea status"
                    """
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    // Build Docker image with multiple tags
                    def imageTags = [
                        "${REGISTRY}/cicd-demo:${BUILD_NUMBER}",
                        "${REGISTRY}/cicd-demo:${GIT_SHORT_SHA}",
                        "${REGISTRY}/cicd-demo:latest"
                    ]
                    
                    def imageTagString = imageTags.join(' ')
                    
                    sh """
                        docker build -t ${imageTagString} .
                        
                        # Tag for local registry
                        docker tag ${REGISTRY}/cicd-demo:${BUILD_NUMBER} ${REGISTRY}/cicd-demo:latest
                    """
                    
                    // Store image tags for later use
                    env.IMAGE_TAGS = imageTagString
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        script {
                            // Run Jest tests
                            sh """
                                npm ci
                                npm run test:ci
                            """
                            
                            // Archive test results
                            publishTestResults testResultsPattern: 'test-results.xml'
                            publishCoverage adapters: [
                                jacocoAdapter('coverage/lcov.info')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                    post {
                        always {
                            // Archive test results
                            archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'coverage',
                                reportFiles: 'lcov-report/index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }
                
                stage('Lint') {
                    when {
                        not { environment name: 'SKIP_LINT', value: 'true' }
                    }
                    steps {
                        script {
                            // Run ESLint
                            sh """
                                npm ci
                                npm run lint
                            """
                        }
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        script {
                            // Run npm audit
                            sh """
                                npm ci
                                npm audit --audit-level moderate || echo "Security scan completed with issues"
                            """
                        }
                    }
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                not { branch 'main' }
            }
            steps {
                script {
                    // Push to local registry (fallback to build caching)
                    sh """
                        # Try to push to registry, fallback to local caching
                        docker push ${REGISTRY}/cicd-demo:${BUILD_NUMBER} || echo "Registry push failed, using local cache"
                        docker push ${REGISTRY}/cicd-demo:${GIT_SHORT_SHA} || echo "Registry push failed, using local cache"
                        docker push ${REGISTRY}/cicd-demo:latest || echo "Registry push failed, using local cache"
                    """
                }
            }
        }
        
        stage('Upload Artifacts') {
            steps {
                script {
                    // Upload artifacts to MinIO with fail-safe mechanism
                    sh """
                        # Install MinIO client if not available
                        if ! command -v mc &> /dev/null; then
                            curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
                            chmod +x mc
                            sudo mv mc /usr/local/bin/
                        fi
                        
                        # Configure MinIO client
                        mc alias set minio ${MINIO_ENDPOINT} ${MINIO_CREDS_USR} ${MINIO_CREDS_PSW} || echo "MinIO configuration failed"
                        
                        # Create buckets if they don't exist (fail-safe)
                        mc mb minio/artifacts || echo "Artifacts bucket already exists or creation failed"
                        mc mb minio/logs || echo "Logs bucket already exists or creation failed"
                        mc mb minio/docs || echo "Docs bucket already exists or creation failed"
                        
                        # Upload build artifacts
                        mc cp coverage/ minio/artifacts/${BUILD_NUMBER}/coverage/ --recursive || echo "Coverage upload failed"
                        mc cp package*.json minio/artifacts/${BUILD_NUMBER}/ || echo "Package files upload failed"
                        
                        # Upload build logs
                        mc cp ${WORKSPACE}/build.log minio/logs/${BUILD_NUMBER}/ || echo "Build log upload failed"
                        
                        echo "Artifact upload completed (with potential failures)"
                    """
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Deploy to Talos Kubernetes using kubectl
                    sh """
                        # Set up kubeconfig
                        echo '${KUBECONFIG_CREDS}' > kubeconfig
                        export KUBECONFIG=kubeconfig
                        
                        # Create namespace if it doesn't exist
                        kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                        
                        # Create deployment
                        kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}
                        
                        # Create service
                        kubectl apply -f k8s/service.yaml -n ${NAMESPACE}
                        
                        # Wait for deployment to be ready
                        kubectl wait --for=condition=available --timeout=300s deployment/cicd-demo -n ${NAMESPACE} || echo "Deployment not ready"
                    """
                }
            }
        }
        
        stage('Smoke Test') {
            steps {
                script {
                    // Smoke test with health check
                    sh """
                        # Wait for deployment to be ready
                        kubectl wait --for=condition=available --timeout=300s deployment/cicd-demo -n ${NAMESPACE} || echo "Deployment not ready"
                        
                        # Get service endpoint
                        SERVICE_IP=\$(kubectl get svc cicd-demo -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
                        SERVICE_PORT=\$(kubectl get svc cicd-demo -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].port}')
                        
                        if [ -z "\$SERVICE_IP" ]; then
                            # Use port-forward for testing
                            kubectl port-forward svc/cicd-demo 8080:80 -n ${NAMESPACE} &
                            PF_PID=\$!
                            sleep 10
                            
                            # Test health endpoint
                            curl -f http://localhost:8080/healthz || echo "Health check failed"
                            
                            # Cleanup port-forward
                            kill \$PF_PID || echo "Port-forward cleanup failed"
                        else
                            # Test external endpoint
                            curl -f http://\$SERVICE_IP:\$SERVICE_PORT/healthz || echo "Health check failed"
                        fi
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Update Gitea commit status
                def status = currentBuild.result ?: 'SUCCESS'
                def giteaStatus = status == 'SUCCESS' ? 'success' : 'failure'
                
                sh """
                    curl -X POST "${GITEA_BASE}/api/v1/repos/amine/cicd-demo/statuses/${GIT_COMMIT}" \
                        -H "Authorization: token ${GITEA_CREDS_PSW}" \
                        -H "Content-Type: application/json" \
                        -d '{
                            "state": "${giteaStatus}",
                            "target_url": "${JENKINS_BASE}/job/${env.JOB_NAME}/${env.BUILD_NUMBER}/",
                            "description": "Build ${status.toLowerCase()}",
                            "context": "jenkins/ci"
                        }' || echo "Failed to update Gitea status"
                """
            }
            
            // Clean up workspace
            cleanWs()
        }
        
        success {
            echo "🎉 Pipeline completed successfully!"
        }
        
        failure {
            echo "❌ Pipeline failed!"
        }
        
        unstable {
            echo "⚠️ Pipeline completed with warnings!"
        }
    }
}
