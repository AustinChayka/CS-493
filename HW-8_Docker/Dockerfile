FROM node:18
WORKDIR C:\Users\austi\OneDrive\Desktop\CS-493\HW-8_Docker
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3000
ENV GOOGLE_APPLICATION_CREDENTIALS='./hw8-chaykaa-47b913852923.json'
EXPOSE ${PORT}
CMD ["npm", "start"]