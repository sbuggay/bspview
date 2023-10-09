FROM node:latest

# Node
RUN mkdir /app
WORKDIR /app

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json

RUN npm install

ENV PATH /app/node_modules/.bin:$PATH

# Nginx
RUN apt-get update && apt-get install -y nginx

COPY ./ /app

ENTRYPOINT ["/app/entrypoint.sh"]