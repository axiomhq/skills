# Integrations

External systems, databases, APIs, and tools for debugging.

---

<!-- Example:

## M-2025-01-10T10:00:00Z orders-db-readonly

- type: integration
- tags: orders, database, postgres
- status: active

**Summary**

Read-only replica of orders database for debugging.

**Connection**

```
Host: orders-replica.db.internal
Port: 5432
Database: orders
User: readonly
Auth: Via SSO tunnel (see wiki)
```

**Useful Queries**

```sql
-- Recent orders for a user
SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;

-- Order state history
SELECT * FROM order_events WHERE order_id = ? ORDER BY timestamp;
```

**Caveats**

- Replica lag: typically <1s, but can spike to 30s during peak
- No access to payment_details table (PCI restricted)

---

## M-2025-01-10T10:05:00Z axiom-dev-org

- type: integration
- tags: axiom, observability
- status: active

**Summary**

Development Axiom organization for testing queries.

**Details**

- Org: axiom-dev
- Datasets: test-logs, test-traces
- Config: ~/.axiom.toml [dev] section

-->
