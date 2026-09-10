# HACKRICULTURE - React frontend (build) served by nginx
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
# API base can be baked in at build time; defaults to same-origin /api.
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCKS=false
ARG VITE_DIRECT_DATA_APIS=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_MOCKS=$VITE_USE_MOCKS \
    VITE_DIRECT_DATA_APIS=$VITE_DIRECT_DATA_APIS
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
