# Imported from: https://github.com/oclif/docker/blob/master/Dockerfile
FROM node:alpine

LABEL org.opencontainers.image.authors="Jahia Dev Team"

# Add bash
RUN apk add --no-cache bash=5.3.3-r1

WORKDIR /usr/share/jahia-reporter/

RUN npm install -g @jahia/jahia-reporter@latest

CMD ["/bin/bash"]