# docling-serve/Dockerfile
# CPU-based Docling REST API server for PDF extraction
# Built from official docling-serve base image

FROM quay.io/docling-project/docling-serve:cpu

# Set environment variables
ENV DOCLING_SERVE_PORT=5001 \
    DOCLING_SERVE_ENABLE_UI=false \
    DOCLING_PERF_PAGE_BATCH_SIZE=4 \
    DOCLING_PERF_ELEMENTS_BATCH_SIZE=8

# Expose port
EXPOSE 5001

# Run the docling-serve server
CMD ["docling-serve", "run", "--host", "0.0.0.0", "--port", "5001"]