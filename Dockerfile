FROM node:20-slim AS admin-build
WORKDIR /admin
COPY app/admin_app/package*.json ./
RUN npm ci --silent
COPY app/admin_app/ ./
RUN npm run build

FROM python:3.10.12
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY ./app ./app
COPY ./assets ./assets
COPY --from=admin-build /admin/dist ./app/admin_app/dist

EXPOSE 8080
CMD uvicorn app.main:app --host=0.0.0.0 --port=$PORT