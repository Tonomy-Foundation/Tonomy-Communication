import { execSync } from 'child_process';

const currentBranch = execSync('git symbolic-ref --short HEAD', {
  encoding: 'utf8',
}).trim();

if (currentBranch === 'development') {
  execSync('yarn add --no-lockfile @tonomy/tonomy-id-sdk@development', {
    stdio: 'inherit',
  });
}