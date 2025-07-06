# Base image
FROM node:18


WORKDIR /usr/src/app


COPY package*.json ./

RUN npm install


COPY . .



RUN npm run build

EXPOSE 3000


CMD ["pnpm", "run", "start:prod"]