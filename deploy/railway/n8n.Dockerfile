FROM docker.n8n.io/n8nio/n8n:2.43.8

USER root
COPY n8n-entrypoint.sh /opt/synapse/n8n-entrypoint.sh
RUN sed -i 's/\r$//' /opt/synapse/n8n-entrypoint.sh && chmod 0555 /opt/synapse/n8n-entrypoint.sh
USER node

ENTRYPOINT ["tini", "--", "/opt/synapse/n8n-entrypoint.sh"]
