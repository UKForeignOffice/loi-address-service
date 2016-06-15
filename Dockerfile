# base image
FROM node:4

ADD package.json /tmp/package.json
RUN cd /tmp && npm install && \
    mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

WORKDIR /opt/app
ADD . /opt/app

EXPOSE 3004
ENV NODE_ENV production
CMD [ "node", "server","3004" ]