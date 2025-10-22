import simpleGit, { SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

export interface BranchPreparationResult {
  branch: string;
  base: string;
  baseCommit: string;
  existed: boolean;
}

export const ensureCleanWorkingTree = async (): Promise<void> => {
  const status = await git.status();
  if (!status.isClean()) {
    throw new Error(
      'Working tree is dirty. Please commit or stash changes before running the agent.',
    );
  }
};

const checkoutBase = async (base: string): Promise<string> => {
  await git.checkout(base);
  try {
    await git.raw(['pull', '--ff-only']);
  } catch (error) {
    throw new Error(`Failed to pull latest changes for ${base}: ${String(error)}`);
  }
  return git.revparse(['HEAD']);
};

export const prepareAgentBranch = async (
  base: string,
  branch: string,
): Promise<BranchPreparationResult> => {
  await ensureCleanWorkingTree();
  const baseCommit = await checkoutBase(base);

  const localBranches = await git.branchLocal();
  const existed = localBranches.all.includes(branch);

  if (existed) {
    await git.checkout(branch);
  } else {
    await git.checkoutLocalBranch(branch);
  }

  return {
    branch,
    base,
    baseCommit,
    existed,
  };
};

export const getCurrentCommit = async (): Promise<string> => {
  return git.revparse(['HEAD']);
};

export const workingTreeHasChanges = async (): Promise<boolean> => {
  const status = await git.status();
  return !status.isClean();
};

export const stageAllChanges = async (): Promise<void> => {
  await git.add(['-A']);
};

export const commitAllChanges = async (message: string): Promise<string> => {
  const result = await git.commit(message);
  return result.commit;
};
