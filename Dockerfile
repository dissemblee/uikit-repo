FROM node:20 as build

WORKDIR /app

ARG GITHUB_TOKEN
RUN npm config set //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN} && \
    npm config set @48-iq:registry https://npm.pkg.github.com

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20 as prod

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main"]