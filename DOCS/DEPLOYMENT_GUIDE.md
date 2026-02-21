# Deployment Guide - IAS SSO & OFM

## Docker Image Build & Push

### IAS SSO (Aksara SSO)
```bash
cd /Users/HERIAWAN/Project/_mya/aksara/sso

# Build Docker image
docker build -t 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ias-sso:latest .

# Login to ECR
aws ecr get-login-password --region ap-southeast-3 | docker login --username AWS --password-stdin 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com

# Push to ECR
docker push 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ias-sso:latest
```

### OFM (Office Facility Management)
```bash
cd /Users/HERIAWAN/Project/_mya/jss/OFM

# Build Docker image
docker build -t 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ofm:latest .

# Login to ECR (if not already logged in)
aws ecr get-login-password --region ap-southeast-3 | docker login --username AWS --password-stdin 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com

# Push to ECR
docker push 851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ofm:latest
```

## Kubernetes Deployment

### Prerequisites
1. Ensure you have `kubectl` configured for your EKS cluster
2. Update the following in `deployment.yaml` before applying:
   - Security group ID: Replace `sg-CHANGEME`
   - Target Group ARN: Replace `CHANGEME` with actual Target Group ID

### Deploy IAS SSO
```bash
cd /Users/HERIAWAN/Project/_mya/aksara/sso

# Apply the deployment
kubectl apply -f deployment.yaml

# Check deployment status
kubectl get deployments -l app=ias-sso
kubectl get pods -l app=ias-sso
kubectl get svc ias-sso-service
kubectl get hpa ias-sso-hpa

# View logs
kubectl logs -l app=ias-sso --tail=100 -f

kubectl rollout restart deployment ias-sso -n development
```

### Deploy OFM
```bash
cd /Users/HERIAWAN/Project/_mya/jss/OFM

# Apply the deployment
kubectl apply -f deployment.yaml

# Check deployment status
kubectl get deployments -l app=ofm
kubectl get pods -l app=ofm
kubectl get svc ofm-service
kubectl get hpa ofm-hpa

# View logs
kubectl logs -l app=ofm --tail=100 -f
```

## Configuration Summary

### IAS SSO
- **Image**: `851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ias-sso:latest`
- **Replicas**: 2-5 (HPA managed)
- **Resources**:
  - Requests: 250m CPU, 512Mi RAM
  - Limits: 500m CPU, 1Gi RAM
- **Port**: 3000
- **Database**: `aksara_sso` on MongoDB Atlas
- **Secret**: `ias-sso-secret`
- **Service**: `ias-sso-service` (ClusterIP)
- **URL**: https://sso.ias.co.id

### OFM
- **Image**: `851725647704.dkr.ecr.ap-southeast-3.amazonaws.com/ofm:latest`
- **Replicas**: 2-10 (HPA managed)
- **Resources**:
  - Requests: 500m CPU, 1Gi RAM
  - Limits: 1000m CPU, 2Gi RAM
- **Port**: 3000
- **Database**: `ofm_dev` on MongoDB Atlas
- **Secret**: `ofm-secret`
- **Service**: `ofm-service` (ClusterIP)
- **URL**: https://ofm.ias.co.id

## Environment Variables

### IAS SSO Environment
```yaml
MONGODB_URI: mongodb+srv://root:pass123word@devday.wmveufv.mongodb.net/?retryWrites=true&w=majority&appName=DevDay
MONGODB_DB: aksara_sso
JWT_SECRET: dev-jwt-secret-key-change-in-production
SESSION_SECRET: dev-session-secret-key-change-in-production
ORIGIN: https://sso.ias.co.id
NODE_ENV: production
```

### OFM Environment
```yaml
MONGODB_URI: mongodb+srv://root:pass123word@devday.wmveufv.mongodb.net/?retryWrites=true&w=majority&appName=DevDay
MONGODB_DB: ofm_dev
SESSION_SECRET: dev-session-secret-key-change-in-production
SSO_CLIENT_SECRET: ofm-secret-2025
SSO_ISSUER: https://sso.ias.co.id
SSO_CLIENT_ID: ofm-client
SSO_REDIRECT_URI: https://ofm.ias.co.id/auth/callback
APP_URL: https://ofm.ias.co.id
ORIGIN: https://ofm.ias.co.id
NODE_ENV: production
```

## Health Checks

Both applications have:
- **Liveness Probe**: HTTP GET `/` on port 3000
  - Initial delay: 30s
  - Period: 10s
  - Timeout: 5s
  - Failure threshold: 3

- **Readiness Probe**: HTTP GET `/` on port 3000
  - Initial delay: 10s
  - Period: 5s
  - Timeout: 3s
  - Failure threshold: 3

## Autoscaling

### IAS SSO HPA
- Min replicas: 2
- Max replicas: 5
- CPU threshold: 70%
- Memory threshold: 80%

### OFM HPA
- Min replicas: 2
- Max replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%
- Scale up: 50% increase per 60s
- Scale down: 25% decrease per 60s (with 300s stabilization)

## Troubleshooting

### Check pod status
```bash
kubectl describe pod <pod-name>
```

### View application logs
```bash
kubectl logs <pod-name> --tail=200 -f
```

### Check HPA metrics
```bash
kubectl get hpa
kubectl describe hpa ias-sso-hpa
kubectl describe hpa ofm-hpa
```

### Test health endpoints
```bash
kubectl port-forward svc/ias-sso-service 8080:80
curl http://localhost:8080/

kubectl port-forward svc/ofm-service 8081:80
curl http://localhost:8081/
```

### Restart deployment
```bash
kubectl rollout restart deployment/ias-sso
kubectl rollout restart deployment/ofm
```

## Security Notes

⚠️ **IMPORTANT**: Current configuration uses development credentials. Before production deployment:

1. Generate secure random strings for JWT_SECRET and SESSION_SECRET
2. Update MongoDB credentials
3. Update security group IDs
4. Update Target Group ARNs
5. Enable network policies
6. Configure backup strategy for MongoDB
7. Setup monitoring and alerting
8. Enable audit logging

## MongoDB Atlas Sizing

Based on DOCS/MongoDB_Sizing_Sheet_untuk-(IAS).csv:

### IAS SSO Production Estimates
- Year 1: 2.5 GB
- Year 3: 4.9 GB
- Recommended tier: **M10**
- Read/Write ratio: 70/30

### OFM Production Estimates
- Year 1: 15 GB
- Year 3: 25.4 GB
- Recommended tier: **M20**
- Read/Write ratio: 60/40 (GPS heavy writes)
- GPS tracking: ~77K points/day for 40 vehicles

## Build Status

✅ **Both projects build successfully!**

- IAS SSO: Build completed in ~17s
- OFM: Build completed in ~7s

Both use `@sveltejs/adapter-node` with output directory `build/`.

## Next Steps

1. Create ECR repositories if not exist:
   ```bash
   aws ecr create-repository --repository-name ias-sso --region ap-southeast-3
   aws ecr create-repository --repository-name ofm --region ap-southeast-3
   ```

2. Build and push Docker images (see above)

3. Update deployment.yaml placeholders:
   - Security group IDs: Replace `sg-CHANGEME`
   - Target Group ARNs: Replace `CHANGEME` with actual TG ID
   - Production secrets (if deploying to production)

4. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f deployment.yaml
   ```

5. Verify deployments and test endpoints:
   ```bash
   kubectl get pods -l app=ias-sso
   kubectl get pods -l app=ofm
   kubectl logs -l app=ias-sso --tail=100
   ```

6. Configure DNS to point to ALB

7. Setup SSL/TLS certificates

8. Enable monitoring and logging

## Fixed Build Issues

### Issue 1: SSO - argon2 Import Error
**Problem**: `Rollup failed to resolve import "@node-rs/argon2"`

**Solution**:
- Replaced `argon2` package with `@node-rs/argon2`
- Updated all imports from `'argon2'` to `'@node-rs/argon2'`
- Changed default imports to named imports (`import { hash, verify }`)
- Fixed dynamic imports: `await import('@node-rs/argon2')`

### Issue 2: OFM - Environment Variable Error
**Problem**: `"MONGODB_URI" is not exported by "virtual:env/static/private"`

**Solution**:
- Changed from `$env/static/private` to `$env/dynamic/private`
- Added fallback to `process.env` for build time
- Updated mongodb.ts to use runtime environment variables

### Issue 3: SvelteKit Adapter
**Problem**: Both projects used `@sveltejs/adapter-auto`

**Solution**:
- Installed `@sveltejs/adapter-node` for both projects
- Configured output directory as `build/`
- Updated Dockerfile to copy from `build/` directory
- Updated CMD to run `bun run build/index.js`
