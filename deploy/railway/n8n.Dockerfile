FROM alpine:3.22 AS user-switch

RUN apk add --no-cache su-exec

FROM n8nio/n8n:2.43.8

USER root
COPY --from=user-switch /sbin/su-exec /sbin/su-exec
COPY n8n-entrypoint.sh /opt/synapse/n8n-entrypoint.sh
RUN sed -i 's/\r$//' /opt/synapse/n8n-entrypoint.sh \
    && chmod 0555 /opt/synapse/n8n-entrypoint.sh /sbin/su-exec \
    && /sbin/su-exec node:node sh -c '[ "$(id -un)" = "node" ]'

ENTRYPOINT ["tini", "--", "/opt/synapse/n8n-entrypoint.sh"]
