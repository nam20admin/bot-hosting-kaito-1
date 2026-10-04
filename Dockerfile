FROM node:18

# Cài đặt Python và pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Cài thư viện discord.py cho Python
RUN pip3 install discord.py requests --break-system-packages

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD [ "node", "index.js" ]
