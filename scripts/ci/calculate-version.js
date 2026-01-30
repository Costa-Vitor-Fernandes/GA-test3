const conventionalRecommendedBump = require('conventional-recommended-bump');
const semver = require('semver');
const { execSync } = require('child_process');
const fs = require('fs');

// 🏁 PONTO DE PARTIDA (Substitua pelo hash real do seu commit de "reinício")
const START_COMMIT = 'e3ebd3b5662cf3456270c5dc7371a17a940b1108'; 
const INITIAL_VERSION = '0.0.0';

async function calculateVersion() {
  try {
    let currentVersion = INITIAL_VERSION;

    // 1. Tentar encontrar a tag mais recente que seja posterior ao nosso START_COMMIT
    try {
      const latestTag = execSync(`git describe --tags --abbrev=0 --since="${START_COMMIT}" 2>/dev/null || echo ""`)
        .toString().trim().replace(/^v/, '');
      
      if (latestTag && semver.valid(latestTag)) {
        currentVersion = latestTag;
      }
    } catch (e) {
      console.log(`Nota: Nenhuma tag encontrada após o commit ${START_COMMIT}. Começando da ${INITIAL_VERSION}`);
    }

    // 2. Calcular o próximo bump baseado APENAS nos commits novos
    const result = await conventionalRecommendedBump({
      preset: 'conventionalcommits',
      tagPrefix: 'v',
      // Aqui forçamos o commitlint a olhar apenas a partir do nosso ponto de partida
      gitRawCommitsOpts: {
        from: START_COMMIT
      }
    });

    const releaseType = result.releaseType || 'patch';
    const newVersion = semver.inc(currentVersion, releaseType);
    
    // 3. Verificar Breaking Changes especificamente neste PR
    const baseRef = process.env.BASE_REF || 'main';
    // Compara o que está na branch atual contra a base, mas limitado pelo START_COMMIT
    const commits = execSync(`git log ${START_COMMIT}..HEAD --format=%B`).toString();
    const hasBreakingChange = commits.includes('BREAKING CHANGE:') || commits.includes('!:');

    // 4. Exportar para o GitHub Actions
    const output = `current=${currentVersion}\nnext=${newVersion}\nrelease_type=${releaseType}\nbreaking=${hasBreakingChange}\n`;
    
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
    }

    console.log(`✅ Sucesso: ${currentVersion} -> ${newVersion} (${releaseType})`);
  } catch (error) {
    console.error('❌ Erro ao calcular a versão:', error);
    process.exit(1);
  }
}

calculateVersion();
