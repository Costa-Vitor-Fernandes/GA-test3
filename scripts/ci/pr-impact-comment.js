module.exports = async ({ github, context }) => {

  const currentVersion = process.env.CURRENT_VERSION;
  const nextVersion = process.env.NEXT_VERSION;
  const releaseType = process.env.RELEASE_TYPE;
  const hasBreaking = process.env.HAS_BREAKING === 'true';

  const mapping = {
    major: { emoji: '💥', text: 'Major (Breaking Change)' },
    minor: { emoji: '✨', text: 'Minor (New Feature)' },
    patch: { emoji: '🐛', text: 'Patch (Bug Fix)' }
  };

  const impact = (hasBreaking || releaseType === 'major') ? mapping.major : mapping[releaseType] || mapping.patch;

  const body = `## ${impact.emoji} Version Impact Analysis

**Current Version:** \`v${currentVersion}\`  
**Predicted Version:** \`v${nextVersion}\`  
**Release Type:** **${impact.text}**

${hasBreaking ? '> ⚠️ **WARNING:** This PR contains BREAKING CHANGES!' : ''}

---
*🤖 This comment is automatically updated by the CI pipeline.*`;

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  });

  const botComment = comments.find(c => c.user.type === 'Bot' && c.body.includes('Version Impact Analysis'));

  const commentPayload = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: body
  };

  if (botComment) {
    await github.rest.issues.updateComment({ ...commentPayload, comment_id: botComment.id });
  } else {
    await github.rest.issues.createComment({ ...commentPayload, issue_number: context.issue.number });
  }
};