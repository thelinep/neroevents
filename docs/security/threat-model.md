# Nevo Threat Model — Initial Baseline

Primary threats:

- credential leakage
- SQL injection through dynamic identifiers
- filesystem path traversal
- malicious ZIP extraction
- command injection
- prompt injection / tool escalation
- cross-project memory leakage
- unauthorized project/task access
- approval bypass

Security boundaries must be enforced server-side; UI state is never a security boundary.
