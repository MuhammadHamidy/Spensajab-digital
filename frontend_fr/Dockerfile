ARG NODE_VERSION=22.19.0
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app

################################################################################
# Development image with full source and devDependencies
FROM base AS dev

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]


################################################################################
# Create a stage for installing production dependecies.
FROM base as deps
# RUN apk add --no-cache libc6-compat

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
################################################################################
FROM deps as build
COPY . .
RUN if [ -f .env.prod ]; then cp .env.prod .env; elif [ -f .example.env.prod ]; then cp .example.env.prod .env; else touch .env; fi

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

RUN npx --yes prisma generate

# Build
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=/api
RUN npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=build /usr/src/app/public ./public
COPY --from=build --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /usr/src/app/node_modules/@prisma /usr/src/app/node_modules/@prisma
COPY --from=build --chown=nextjs:nodejs /usr/src/app/src/generated /usr/src/app/src/generated

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
