import { dirname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

export async function resolve(specifier, context, defaultResolve) {
    console.log('Resolving', specifier, 'from', context.parentURL)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        try {
            // Try to resolve the file with the .js extension
            const parentDir = dirname(fileURLToPath(context.parentURL));
            const resolvedPath = pathResolve(parentDir, specifier + '.js');
            console.log('Try to resolve to', resolvedPath)
            await fs.access(resolvedPath);
            return defaultResolve(specifier + '.js', context, defaultResolve);
        } catch (e) {
            // If it fails, fallback to default behavior
        }
    }
    if (specifier.endsWith('.json')) {
        console.log('Resolving as JSON', specifier);
        return defaultResolve(specifier, context, { assert: { type: 'json' } });
    } else {
        return defaultResolve(specifier, context, defaultResolve);
    }
}
