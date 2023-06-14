const { spawnSync } = require('child_process');

const currentBranch = spawnSync('git', ['symbolic-ref', '--short', 'HEAD'], {
  encoding: 'utf8',
}).stdout.trim();

console.log(currentBranch);

if (currentBranch !== 'master') {
  console.log('executed');
  const result = spawnSync(
    'yarn',
    ['add', '@tonomy/tonomy-id-sdk@development'],
    {
      stdout: 'inherit',
    },
  );

  console.log('package detail', result);

  if (result.status !== 0 || result.error || result.signal) {
    console.error(
      'Failed to add package:',
      result.error || result.signal || result.stderr,
    );
    process.exit(1);
  }
}
