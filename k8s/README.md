# ESGPlatform — Kubernetes Deployment Guide

This guide covers deploying ESGPlatform (GreenConnect) on a Kubernetes cluster.

---

## Prerequisites

| Tool | Minimum version | Purpose |
|------|----------------|---------|
| kubectl | 1.28+ | Cluster management |
| helm | 3.12+ | Install cert-manager and ingress-nginx |
| cert-manager | 1.13+ | Automatic TLS via Let's Encrypt |
| ingress-nginx | 1.9+ | HTTP/S ingress controller |

### Install ingress-nginx

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.replicaCount=2
```

### Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

Create the ClusterIssuer for Let's Encrypt production:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@greenconnect.cloud
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

```bash
kubectl apply -f clusterissuer.yaml
```

---

## Secrets setup

Copy the example and fill in real values before applying:

```bash
cp k8s/secrets.yaml.example k8s/secrets.yaml
# Edit k8s/secrets.yaml — replace every CHANGE_ME value
kubectl apply -f k8s/secrets.yaml
# Delete the local file after applying — never commit secrets
rm k8s/secrets.yaml
```

Generate strong secrets:

```bash
# JWT / App secret keys
openssl rand -hex 32

# Strong password
openssl rand -base64 24
```

---

## Deployment order

Apply manifests in this exact order to respect dependencies.

### 1. Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Secrets (must exist before any pod starts)

```bash
kubectl apply -f k8s/secrets.yaml   # your filled copy — not committed
```

### 3. PostgreSQL StatefulSet

```bash
kubectl apply -f k8s/postgres/statefulset.yaml
```

Wait for Postgres to be ready:

```bash
kubectl rollout status statefulset/esgplatform-postgres -n esgplatform
```

### 4. Redis

```bash
kubectl apply -f k8s/redis/deployment.yaml
```

### 5. Backend

```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl apply -f k8s/backend/hpa.yaml
```

### 6. Frontend

```bash
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml
```

### 7. Ingress (TLS)

```bash
kubectl apply -f k8s/ingress.yaml
```

---

## One-shot apply (after secrets are in place)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```

---

## Verification

### Check all pods are Running

```bash
kubectl get pods -n esgplatform
```

Expected output:

```
NAME                                    READY   STATUS    RESTARTS
esgplatform-backend-xxxxxxxxx-xxxxx     1/1     Running   0
esgplatform-frontend-xxxxxxxxx-xxxxx    1/1     Running   0
esgplatform-postgres-0                  1/1     Running   0
esgplatform-redis-xxxxxxxxx-xxxxx       1/1     Running   0
```

### Check services

```bash
kubectl get svc -n esgplatform
```

### Check ingress and TLS certificate

```bash
kubectl get ingress -n esgplatform
kubectl get certificate -n esgplatform
kubectl describe certificate esgplatform-tls -n esgplatform
```

The certificate STATUS should show `True` under READY within a few minutes.

### Health check

```bash
curl -k https://greenconnect.cloud/health
```

---

## Updating container images

### Backend

```bash
kubectl set image deployment/esgplatform-backend \
  backend=your-registry/esgplatform-backend:NEW_TAG \
  -n esgplatform
kubectl rollout status deployment/esgplatform-backend -n esgplatform
```

### Frontend

```bash
kubectl set image deployment/esgplatform-frontend \
  frontend=your-registry/esgplatform-frontend:NEW_TAG \
  -n esgplatform
kubectl rollout status deployment/esgplatform-frontend -n esgplatform
```

---

## Rollback

### Roll back to the previous revision

```bash
kubectl rollout undo deployment/esgplatform-backend -n esgplatform
kubectl rollout undo deployment/esgplatform-frontend -n esgplatform
```

### Roll back to a specific revision

```bash
# List revision history
kubectl rollout history deployment/esgplatform-backend -n esgplatform

# Roll back to revision 3
kubectl rollout undo deployment/esgplatform-backend --to-revision=3 -n esgplatform
```

---

## Debug commands

### View pod logs

```bash
# Backend (last 100 lines, follow)
kubectl logs -n esgplatform -l app=esgplatform-backend --tail=100 -f

# Frontend
kubectl logs -n esgplatform -l app=esgplatform-frontend --tail=50 -f

# Postgres
kubectl logs -n esgplatform esgplatform-postgres-0 --tail=50

# Redis
kubectl logs -n esgplatform -l app=esgplatform-redis --tail=50
```

### Shell into a pod

```bash
# Backend shell
kubectl exec -it -n esgplatform \
  $(kubectl get pod -n esgplatform -l app=esgplatform-backend -o name | head -1) \
  -- /bin/bash

# Postgres psql
kubectl exec -it -n esgplatform esgplatform-postgres-0 \
  -- psql -U esgflow -d esgflow
```

### Describe a pod (useful for CrashLoopBackOff)

```bash
kubectl describe pod -n esgplatform \
  $(kubectl get pod -n esgplatform -l app=esgplatform-backend -o name | head -1)
```

### Check events in the namespace

```bash
kubectl get events -n esgplatform --sort-by='.lastTimestamp'
```

### Check HPA status

```bash
kubectl get hpa -n esgplatform
kubectl describe hpa esgplatform-backend-hpa -n esgplatform
```

---

## Scaling

### Manual scale

```bash
kubectl scale deployment esgplatform-backend --replicas=3 -n esgplatform
kubectl scale deployment esgplatform-frontend --replicas=2 -n esgplatform
```

### HPA is configured for the backend

The HPA (`k8s/backend/hpa.yaml`) auto-scales the backend between its configured min and max replicas based on CPU utilization. No manual intervention needed under normal load.

---

## Storage

PostgreSQL data is stored in a PersistentVolumeClaim named `postgres-data-esgplatform-postgres-0`.

```bash
# Check PVC status
kubectl get pvc -n esgplatform

# Disk usage inside postgres pod
kubectl exec -n esgplatform esgplatform-postgres-0 \
  -- df -h /var/lib/postgresql/data
```

---

## Teardown (destructive)

```bash
# Delete all resources in the namespace (keeps PVCs)
kubectl delete all --all -n esgplatform

# Delete PVCs (permanent data loss)
kubectl delete pvc --all -n esgplatform

# Delete namespace entirely
kubectl delete namespace esgplatform
```
