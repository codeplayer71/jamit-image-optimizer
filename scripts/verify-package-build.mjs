import {
    access,
    readFile,
    readdir,
} from 'node:fs/promises';
import path from 'node:path';

const rootDirectory = process.cwd();

const distDirectory = path.join(
    rootDirectory,
    'dist',
);

const entryFile = path.join(
    distDirectory,
    'index.js',
);

async function getFiles(
    directory,
) {
    const entries = await readdir(
        directory,
        {
            withFileTypes: true,
        },
    );

    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(
            directory,
            entry.name,
        );

        if (entry.isDirectory()) {
            files.push(
                ...await getFiles(
                    entryPath,
                ),
            );

            continue;
        }

        files.push(entryPath);
    }

    return files;
}

async function verifyPackageBuild() {
    try {
        await access(entryFile);
    } catch {
        throw new Error(
            'dist/index.js does not exist. Run the package build before verifying it.',
        );
    }

    const entrySource = await readFile(
        entryFile,
        'utf8',
    );

    const distFiles = await getFiles(
        distDirectory,
    );

    const externalWorkerFiles =
        distFiles.filter((file) =>
            /image-worker-.*\.js$/u.test(
                path.basename(file),
            ),
        );

    if (externalWorkerFiles.length > 0) {
        throw new Error(
            [
                'The package build contains an external image worker.',
                'The worker must remain inline so consumer production builds do not need to copy a separate worker asset.',
                ...externalWorkerFiles.map(
                    (file) =>
                        `- ${path.relative(
                            rootDirectory,
                            file,
                        )}`,
                ),
            ].join('\n'),
        );
    }

    if (
        entrySource.includes(
            'assets/image-worker-',
        )
    ) {
        throw new Error(
            'dist/index.js references an external image-worker asset.',
        );
    }

    if (
        !entrySource.includes(
            'createObjectURL',
        )
    ) {
        throw new Error(
            'dist/index.js does not contain the expected inline worker Blob creation.',
        );
    }

    if (
        !/data:text\/javascript(?:;charset=utf-8)?,/u.test(
            entrySource,
        )
    ) {
        throw new Error(
            'dist/index.js does not contain the expected inline JavaScript worker payload.',
        );
    }

    if (
        !entrySource.includes(
            'new Worker',
        )
    ) {
        throw new Error(
            'dist/index.js does not contain a Web Worker constructor.',
        );
    }

    console.log(
        '✓ Package worker build verified.',
    );

    console.log(
        '  Worker is bundled inline.',
    );

    console.log(
        '  No external image-worker asset is present.',
    );
}

verifyPackageBuild().catch((error) => {
    console.error(
        'Package build verification failed.',
    );

    console.error(
        error instanceof Error
            ? error.message
            : error,
    );

    process.exitCode = 1;
});