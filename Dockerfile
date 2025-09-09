FROM node:22-alpine

COPY . .

RUN npm install

RUN npx prisma generate

EXPOSE 3000

#npm run start:dev
CMD ["npm", "run", "start:dev"]