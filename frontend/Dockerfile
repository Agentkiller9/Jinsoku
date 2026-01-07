# Use a modern Node.js image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
# This is cached by Docker to speed up future builds
COPY package*.json ./
RUN npm install

# --- NEW FIX ---
# Explicitly install papaparse to ensure it's in the node_modules
# This helps avoid issues with local node_modules volumes.
RUN npm install papaparse
# --- END FIX ---

# Copy the rest of the app's code
COPY . .

# Expose the Vite port
EXPOSE 3000

# Run the dev server and make it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]