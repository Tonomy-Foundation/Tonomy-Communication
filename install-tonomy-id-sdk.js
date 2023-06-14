const { execSync } = require('child_process');

const currentBranch = execSync('git symbolic-ref --short HEAD', {
  encoding: 'utf8',
}).trim();

console.log(currentBranch);

if (currentBranch !== 'master') {
  execSync('yarn add @tonomy/tonomy-id-sdk@development', {
    stdio: 'inherit',
  });
}
