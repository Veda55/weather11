#!/bin/bash

set -e

echo "==================================="
echo "Weather App Kubernetes Deployment"
echo "==================================="
echo ""

NAMESPACE=${1:-default}
IMAGE_TAG=${2:-latest}
DOCKER_IMAGE="weather-analytics-dashboard:${IMAGE_TAG}"

echo "Deployment Configuration:"
echo "  Namespace: ${NAMESPACE}"
echo "  Image: ${DOCKER_IMAGE}"
echo ""

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

echo "✓ kubectl found"

if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Is Minikube running?"
    exit 1
fi

echo "✓ Connected to Kubernetes cluster"
echo ""

if [ "${NAMESPACE}" != "default" ]; then
    echo "Creating namespace: ${NAMESPACE}"
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
fi

echo "Applying Kubernetes manifests..."
kubectl apply -f ../k8s/deployment.yaml -n ${NAMESPACE}
kubectl apply -f ../k8s/service.yaml -n ${NAMESPACE}

echo ""
echo "Updating deployment image to: ${DOCKER_IMAGE}"
kubectl set image deployment/weather-app weather-app=${DOCKER_IMAGE} -n ${NAMESPACE} --record

echo ""
echo "Waiting for deployment to roll out..."
kubectl rollout status deployment/weather-app -n ${NAMESPACE} --timeout=5m

echo ""
echo "==================================="
echo "Deployment Status"
echo "==================================="
kubectl get deployments -n ${NAMESPACE}
echo ""
kubectl get pods -n ${NAMESPACE} -l app=weather-app
echo ""
kubectl get services -n ${NAMESPACE}
echo ""

MINIKUBE_IP=$(minikube ip 2>/dev/null || echo "localhost")
NODE_PORT=$(kubectl get service weather-app-service -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].nodePort}')

echo "==================================="
echo "✅ Deployment Successful!"
echo "==================================="
echo ""
echo "Access the application at:"
echo "  http://${MINIKUBE_IP}:${NODE_PORT}"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/weather-app -n ${NAMESPACE}"
echo ""
echo "To scale deployment:"
echo "  kubectl scale deployment/weather-app --replicas=5 -n ${NAMESPACE}"
echo ""
echo "To delete deployment:"
echo "  kubectl delete -f ../k8s/deployment.yaml -n ${NAMESPACE}"
echo "  kubectl delete -f ../k8s/service.yaml -n ${NAMESPACE}"
echo ""