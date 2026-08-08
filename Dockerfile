FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# جذر Express
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# منصة البطولات (Next)
COPY platform/package.json platform/package-lock.json* ./platform/
RUN npm install --prefix platform

COPY . .

# بناء Next في الإنتاج (NEXT_PUBLIC_* تُقرأ من متغيرات Railway وقت البناء)
RUN npm run build --prefix platform

ENV NODE_ENV=production
ENV PORT=3847
EXPOSE 3847

CMD ["npm", "start"]
