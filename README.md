# kleros-bot

This repository contains the bot responsible for listening to the contract `PING` events and sending only one `PONG` in response.

### Running the bot locally

First, install the dependencies.

```sh
pnpm install
```

Then, create the `env` file and fill the needed variables:

```sh
cp .env.example .env
```

Finally, start the bot with:

```sh
pnpm start
```
