"""Prometheus metrics for the ESG platform."""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time

# HTTP metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Business metrics
esg_scores_calculated_total = Counter(
    "esg_scores_calculated_total",
    "Total ESG scores calculated",
    ["organization_id"]
)

active_tenants_total = Gauge(
    "active_tenants_total",
    "Number of active tenants"
)

supply_chain_suppliers_total = Gauge(
    "supply_chain_suppliers_total",
    "Total supply chain suppliers tracked",
    ["tenant_id"]
)
