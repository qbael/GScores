FROM postgres:18

HEALTHCHECK --interval=2s --timeout=5s --retries=30 \
    CMD pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
