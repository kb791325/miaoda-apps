import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SwaggerConfigService } from './swagger-config.service';

@Controller('api/docs')
export class SwaggerDocsController {
  constructor(private readonly swaggerConfig: SwaggerConfigService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  swaggerUi(@Res() res: Response) {
    const document = this.swaggerConfig.getDocument();
    if (!document) {
      return res.status(503).send('Swagger 文档未就绪');
    }

    const specJson = JSON.stringify(document);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>牧唐行政资产盘点看板 API 文档</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function() {
      const spec = ${specJson};
      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        docExpansion: "list",
        filter: true,
        showRequestDuration: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`;

    return res.send(html);
  }

  @Get('json')
  @Header('Content-Type', 'application/json')
  swaggerJson(@Res() res: Response) {
    const document = this.swaggerConfig.getDocument();
    if (!document) {
      return res.status(503).json({ error: 'Swagger 文档未就绪' });
    }
    return res.json(document);
  }
}