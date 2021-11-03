const app = new Koa();

Sentry.init({
  dsn: config.get('sentry.url'),
  environment: config.get('sentry.environment'),
});

const server = createServer(app.callback());

const router = Router();
const generator = new SwaggerAPI();
generator.addJoiRouter(accountsRouter);

router.get('/api.json', async (ctx) => {
  ctx.body = JSON.stringify(spec, null, '  ');
});

app.use(httpLogger());
app.use(koaPassport.initialize());
app.use(
  cors({
    credentials: true,
  })
);

app.use(
  ignoreAssets(
    bodyParser({
      multipart: true,
      includeUnparsed: true,
    })
  )
);

app.use(helmet());

app.use(errorCatcherMiddleware);

app.use(
  koaSwagger({
    routePrefix: '/docs',
    hideTopbar: true,
    swaggerOptions: {
      url: `${config.get('server.baseUrl')}/api.json`,
    },
  })
);

router.get('/', async (ctx) => {
  ctx.body = 'It works!';
});
router.use(accountsRouter.middleware());

app.use(router.middleware());

app.on('error', (err, ctx) => {
  Sentry.withScope((scope) => {
    scope.addEventProcessor((event) => {
      return Sentry.Handlers.parseRequest(event, ctx.request);
    });
    Sentry.captureException(err);
  });
});

server.listen(config.get('server.port'), () => {
  console.log(`Server running on port ${config.get('server.port')}`);
});
