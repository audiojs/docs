
# audiojs docs

> Documentation for audiojs packages

Add repos to the `modules.json` then run `deploy` script.  It makes the requests to github and caches inside `deploy/cache`

Inspired from [`pull-stream/pull-stream-docs`](https://github.com/pull-stream/pull-stream-docs) and [`stackgl/packages`](https://github.com/stackgl/packages)

## Scripts

To build the site to `dist/`:

```sh
npm run build
```

To build & deploy to gh-pages:

```sh
npm run deploy
```

To clear package cache:

```sh
npm run clean:cache
```
