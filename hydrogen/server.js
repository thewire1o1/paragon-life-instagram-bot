import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';
import {handleAPI} from './src/server/index.js';

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      const url = new URL(request.url);
      const runtimeContext = executionContext ?? {waitUntil() {}};

      // Preserve the existing commerce API's JSON responses and status codes.
      // Sending these through React Router would convert thrown validation
      // errors into the HTML error boundary.
      if (url.pathname.startsWith('/api/')) {
        try {
          return await handleAPI(request, env, url);
        } catch (error) {
          return Response.json(
            {error: 'The store could not complete this request.'},
            {
              status: 502,
              headers: {
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
              },
            },
          );
        }
      }

      // Cloudflare Pages advanced mode sends every request through this
      // Worker. Forward generated browser assets to Pages' asset service.
      // Oxygen and ChatGPT Sites serve these files before the Worker, so
      // this branch is only used when the ASSETS binding is available.
      if (url.pathname.startsWith('/assets/') && env?.ASSETS?.fetch) {
        return env.ASSETS.fetch(request);
      }

      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        runtimeContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
