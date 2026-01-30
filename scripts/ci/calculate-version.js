import semver from 'semver';
import { execSync } from 'child_process';
import fs from 'fs';

// BASE_TAG: commit hash or tag reference (e.g., "739431593c8d52063b1f757975c0d47fc12007f9" or "v0.0.1")
// BASE_VERSION: the semantic version at that tag/commit (e.g., "0.0.1")
const baseTag = process.env.BASE_TAG || '739431593c8d52063b1f757975c0d47fc12007f9';
const baseVersion = process.env.BASE_VERSION || '0.0.1';

function getCommitsFromTag() {
  try {
    const commits = execSync(`git log ${baseTag}..HEAD --format=%H||%s||%b####`, { encoding: 'utf-8' })
      .trim()
      .split('####')
      .filter(Boolean)
      .map(commit => {
        const [hash, subject, body] = commit.split('||');
        return {
          sha: hash.trim(),
          message: `${subject}\n${body || ''}`.trim()
        };
      });
    return commits;
  } catch (error) {
    console.error('Error getting commits from git:', error.message);
    return [];
  }
}

function analyzeCommitMessage(message) {
  const firstLine = message.split('\n')[0];
  
  const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
  const typeMatch = types.find(type => firstLine.startsWith(`${type}:`) || firstLine.startsWith(`${type}(`));
  
  if (!typeMatch) {
    return { valid: false, type: null, breaking: false };
  }

  const hasExclamation = firstLine.includes('!:');
  const hasBreakingFooter = message.includes('BREAKING CHANGE:');
  const breaking = hasExclamation || hasBreakingFooter;

  return { valid: true, type: typeMatch, breaking };
}

function determineVersionBump(commits) {
  let bump = 'patch';
  const invalidCommits = [];

  for (const commit of commits) {
    const analysis = analyzeCommitMessage(commit.message);

    if (!analysis.valid) {
      invalidCommits.push({
        sha: commit.sha.substring(0, 7),
        message: commit.message.split('\n')[0]
      });
      continue;
    }

    if (analysis.breaking) {
      bump = 'major';
    } else if (analysis.type === 'feat' && bump !== 'major') {
      bump = 'minor';
    }
  }

  return { bump, invalidCommits };
}

function getCurrentVersion() {
  if (!semver.valid(baseVersion)) {
    throw new Error(`Invalid semver BASE_VERSION: ${baseVersion}`);
  }
  return baseVersion;
}

function main() {
  try {
    const commits = getCommitsFromTag();
    
    if (commits.length === 0) {
      const comment = '⚠️ Nenhum commit encontrado neste Pull Request.';
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `comment=${comment}\n`);
      return;
    }

    const { bump, invalidCommits } = determineVersionBump(commits);

    if (invalidCommits.length > 0) {
      const commitList = invalidCommits
        .map(c => `- \`${c.sha}\`: ${c.message}`)
        .join('\n');
      
      const comment = `❌ **Commits inválidos detectados**\n\nOs seguintes commits não seguem o padrão Conventional Commits:\n\n${commitList}\n\n📖 Consulte: https://www.conventionalcommits.org/`;
      
      console.error('Invalid commits found:', invalidCommits);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `comment=${comment}\n`);
      process.exit(1);
    }

    const currentVersion = getCurrentVersion();
    const nextVersion = semver.inc(currentVersion, bump);
    const impact = { major: 'Major', minor: 'Minor', patch: 'Patch' }[bump];

    const comment = `✅ **Previsão de Versão**\n\nOi! Este PR vai gerar a versão **v${nextVersion}**.\n\n📊 **Impacto:** ${impact}\n📌 Estávamos na **v${currentVersion}** e vamos para **v${nextVersion}**`;

    console.log(`Current version: v${currentVersion}`);
    console.log(`Next version: v${nextVersion}`);
    console.log(`Bump type: ${bump}`);
    
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `comment=${comment}\n`);
  } catch (error) {
    console.error('Error in main execution:', error);
    const comment = `❌ **Erro ao calcular versão**\n\n${error.message}`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `comment=${comment}\n`);
    process.exit(1);
  }
}

main();
