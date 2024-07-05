// hooks.mjs
import { promises as fs } from 'fs';
import { dirname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';

export async function resolve(specifier, context, nextResolve) {
    console.log('Resolving', specifier, 'from', context.parentURL);
    const { parentURL = null } = context;

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        try {
            // Try to resolve the file with the .js extension
            const parentDir = dirname(fileURLToPath(parentURL));
            const resolvedPath = pathResolve(parentDir, specifier);
            console.log('Try to resolve to', resolvedPath + '.js');
            await fs.access(resolvedPath + '.js');
            return nextResolve(specifier + '.js', context);
        } catch (e) {
            // If it fails, you might want to handle the error or defer to nextResolve
        }
    }

    // Defer to the next hook in the chain
    if (specifier.endsWith('json')) {
        console.log('Resolving', specifier, 'as JSON');
        return nextResolve(specifier, { ...context, importAttributes: { type: 'json' } });
    } else {
        console.log('Resolving', specifier, 'as module')
        return nextResolve(specifier, context);
    }
}