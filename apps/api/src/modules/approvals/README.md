# Approval boundary

Protected agent operations must transition through:

`PROPOSED -> AWAITING_APPROVAL -> APPROVED|REJECTED -> EXECUTING -> COMPLETED|FAILED`

Do not treat a boolean `true` return from an approval function as authorization.
