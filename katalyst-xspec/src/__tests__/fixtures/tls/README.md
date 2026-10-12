Test-only TLS material for the OIDC mTLS tests (self-signed, never trusted anywhere else).
`server.*` is a cert for 127.0.0.1 / localhost; `client.*` is a client cert with CN=mtls-client; both are signed by `ca.pem`.
