import { getToken } from '@auth/core/jwt';
import React from 'react';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToString } from 'react-dom/server';
import routes from '../../../routes';
// Avoid external error serializers to keep dev environments simple

function serializeClean(err) {
	const e = err || {};
	return {
		name: e.name || 'Error',
		message: e.message || String(e),
		stack: typeof e.stack === 'string' ? e.stack : undefined,
	};
}
const getHTMLOrError = (component) => {
	try {
		const html = renderToString(React.createElement(component, {}));
		return { html, error: null };
	} catch (error) {
		return { html: null, error: serializeClean(error) };
	}
};
export async function GET(request) {
	const results = await Promise.allSettled(
		routes.map(async (route) => {
			let component = null;
			try {
            const spec = pathToFileURL(path.join('../../../', route.file)).href;
            const response = await import(
                /* @vite-ignore */ spec
            );
				component = response.default;
			} catch (error) {
				console.debug('Error importing component:', route.file, error);
			}
			if (!component) {
				return null;
			}
			const rendered = getHTMLOrError(component);
			return {
				route: route.file,
				path: route.path,
				...getHTMLOrError(component),
			};
		})
	);
	const cleanedResults = results
		.filter((result) => result.status === 'fulfilled')
		.map((result) => {
			if (result.status === 'fulfilled') {
				return result.value;
			}
			return null;
		})
		.filter((result) => result !== null);
	return Response.json({ results: cleanedResults });
}
