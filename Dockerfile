FROM node:14.6.0-stretch as build
WORKDIR /build
COPY package*.json ./
RUN npm i
COPY tsconfig.json ./
COPY /src ./src
RUN npm run build

FROM node:14.6.0-stretch as final
ENV NODE_ENV=prod
WORKDIR /app
COPY --from=build /build/dist ./
COPY --from=build /build/package*.json ./
RUN npm i --production
ENTRYPOINT ["node", "."]
