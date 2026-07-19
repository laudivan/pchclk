#!/usr/bin/env bash
# =============================================================================
# gen-certs.sh — Generate a self-signed TLS certificate for PchClk LAN HTTPS
# =============================================================================
# Usage: bash gen-certs.sh [LAN_IP]
#   LAN_IP  Your machine's LAN IP (default: 192.168.0.5)
#
# After running, rebuild the container:
#   podman-compose down && podman-compose up -d --build
# =============================================================================

LAN_IP="${1:-192.168.0.5}"
CERT_DIR="$(dirname "$0")/certs"

mkdir -p "$CERT_DIR"

echo "Generating self-signed TLS certificate for:"
echo "  - localhost"
echo "  - 127.0.0.1"
echo "  - ${LAN_IP}"

openssl req -x509 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out    "$CERT_DIR/cert.pem" \
  -days   3650 \
  -nodes \
  -subj   "/CN=PchClk/O=PchClk/C=BR" \
  -addext "subjectAltName=IP:127.0.0.1,IP:${LAN_IP},DNS:localhost"

echo ""
echo "Done! Certificates written to ./certs/"
echo ""
echo "Next step — rebuild and restart the container:"
echo "  podman-compose down && podman-compose up -d --build"
echo ""
echo "Then open https://${LAN_IP}:3000 in your browser."
echo "Accept the self-signed certificate warning to proceed."
